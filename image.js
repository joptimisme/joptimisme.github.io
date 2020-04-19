const fs = require('fs')
const execa = require('execa')
const { join, parse: pathParse } = require('path')
const sharp = require('sharp')
const pngquant = require('imagemin-pngquant')()
const webp = require('imagemin-webp')({ quality: 50 })

const { readdir, readFile, writeFile } = fs.promises

const delim = '<!-- ⚡ -->'
const imgTypes = [
  { type: 'webp', handler: webp },
  { type: 'png', handler: pngquant }
]

const gitAdd = async ({ name, content }) => {
  await writeFile(name, content, 'utf8')
  await execa('git', ['add', name])
}

const buildImage = async (image, w) => {
  console.log('sharpening...')
  const sharped = sharp(image)
  const { width, height } = await sharped.metadata()
  console.log({width, height})
  const [ buf, bufX2 ] = await Promise.all([
    sharped.resize(Math.min(width, w)).toBuffer(),
    sharped.resize(Math.min(width, w * 2)).toBuffer()
  ])
  console.log('resized')

  return {
    width,
    height,
    version: await Promise.all(imgTypes.map(({ type, handler }) =>
      Promise.all([ handler(buf), handler(bufX2) ])
        .then(sizes => ({ type, sizes }))))
  }
}

const buildArticleHTML = ({ id, ratio }) => `
  <div class="article" id="${id}" --data-date="${Date.now()}" style="padding-top: ${ratio}%"></div>`

const exportImage = async file => {
  const id = pathParse(file).name
  const body = await readFile(join('source', file))
  console.log(id, 'reading OK')

  const image = await buildImage(body, 702)
  console.log(id, 'build OK')

  const versions = image.version.flatMap(({ type, sizes: [x1, x2] }) => [
    { name: join('img', `${id}.${type}`), content: x1 },
    { name: join('img', 'x2', `${id}.${type}`), content: x2 },
  ])

  await Promise.all(versions.map(gitAdd))
  console.log(id, 'created')

  return { id, ratio: ((image.height / image.width) * 100).toFixed(4) }
}

const exec = async () => {
  await execa('git', ['pull', '-r', '--autostash'])
  const [srcFiles, img] = await Promise.all([ readdir('source'), readdir('img') ])
  const available = img.filter(f => f.endsWith('.png')).map(f => f.slice(0, -4))
  const addedFiles = srcFiles
    .filter(f => f.endsWith('.png') && !available.includes(pathParse(f).name))

  if (!addedFiles.length) return console.log('no new files')
  console.log(addedFiles.length, 'image to add...')
  await execa('git', ['add', ...srcFiles.map(s => join('source', s))])
  const files = await Promise.all(addedFiles.map(exportImage))

  console.log('adding images to index...')
  const indexBody = await readFile('index.html', 'utf8')
  const [left, right] = indexBody.toString('utf8').split(delim)
  const articles = files.map(buildArticleHTML)
  const content = `${left}${delim}${articles.join('')}${right}`
  await gitAdd({ name: 'index.html', content })
  await execa('git', ['push'])
  console.log('index done, All done !')
  return 'OK'
}

exec()
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
