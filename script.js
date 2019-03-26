var mailLink = document.getElementById('mail-link')
var subBox = document.getElementById('sub-box')
mailLink.href = mailLink.href.replace('nospam', 'lemo')

function get(url, cb) {
  var req = new XMLHttpRequest()
  req.onreadystatechange = function () {
    this.readyState === XMLHttpRequest.DONE && cb.call(this, this)
  }
  req.open('GET', url, true)
  req.send(null)
  return req
}

function readystatehandler(req) {
  if (req.status !== 200) {
    subBox.style.backgroundImage = "url('./img/s-abonner.gif')"
    subBox.style.backgroundSize = '100%'
    forEach.call(subBox.getElementsByTagName('input'), function (input) {
      input.disabled = false
      input.style.visibility = ''
    })
    return console.error(req.status, req.statusText)
  }
  console.log(req.responseText)
  subBox.style.backgroundImage = "url('./img/confirmation-abonnement.gif')"
  subBox.style.backgroundSize = '70%'
}

subBox.addEventListener('submit', function (event) {
  event.preventDefault()
  subBox.style.backgroundImage = "url('./img/sablier.gif')"
  subBox.style.backgroundSize = '10%'
  forEach.call(subBox.getElementsByTagName('input'), function (input) {
    input.disabled = true
    input.style.visibility = 'hidden'
  })
  var email = document.getElementById('email').value
  get(api +'/sub?email='+ email, readystatehandler)
})

get('https://joptimisme.github.io/?'+ +(new Date), function (req) {
  var parser = new DOMParser()
  var doc = parser.parseFromString(req.responseText, 'text/html')
  var container = document.getElementById('container')
  var fresh = map
    .call(doc.getElementsByClassName('article'), function (el) { return el })
    .filter(function (el) { return !articlesById[el.id] })
    .reverse()

  fresh.forEach(function (el) {
    container.prepend(el)
    articles.unshift({ el: el, id: el.id })
  })

  fresh.length && articles.forEach(processArticle)
  fresh.length && recalcPositions()
})

