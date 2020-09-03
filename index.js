var http = require('http')
var fs = require('fs')
var url = require('url')

var port = process.env.PORT || 8080

var server = http.createServer(function (request, response) {
  var temp = url.parse(request.url, true)
  var path = temp.pathname
  var query = temp.query
  var method = request.method

  if (path === '/') {
    let string = fs.readFileSync('./index.html', 'utf8')
    //var amount = fs.readFileSync('./db', 'utf8')  //db的值是100   文件的类型是string
    //string = string.replace('&&&amount&&&', amount)
    let cookies = request.headers.cookie.split(';')
    let hash ={}
    for (let i = 0; i<cookies.length;i++)
    {
      let parts = cookies[i].split('=')
      let key = parts[0]
      let value = parts[1]
      hash[key] = value
    }
    let email = hash.sign_in_email
    let users = fs.readFileSync('./database/users','utf8')
    users = JSON.parse(users)
    for (let i = 0; i<users.length; i++)
    {
      if (users[i].email ===  email)
      {
        var foundUser = users[i]
        break
      }
    }
    if (foundUser)
    {
      string = string.replace('__password__',foundUser.password)
    }
    else
    {
      string = string.replace('__password__','unknown user')
    }
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  }
  else if (path === '/sign_up' && method === 'GET')
  //这边只考虑了路径并没有考虑method 所以前面用ajax提post请求也是可以的
  {
    let string = fs.readFileSync('./sign_up.html', 'utf8')
    response.statusCode = 200
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write(string)
    response.end()
  }
  else if (path === '/sign_up' && method === 'POST') {
    readBody(request).then((body) => {
      let strings = body.split('&')
      let hash = {}
      strings.forEach((string) => {
        let parts = string.split('=')  //['email','1']
        let key = parts[0]
        let value = parts[1]
        hash[key] = decodeURIComponent(value)
        //李爵士不允许在value中有@符号出现，所以一般这里面都会被转化成%40
      })
      console.log(hash)
      /*let email = hash['emial']
      let password = hash['password']
      let password = hash['password_confirm']*/
      let {email, password, password_confirm} = hash
      if (email.indexOf('@') === -1) {
        response.statusCode = 400
        response.setHeader('Content-Type', 'application/json;charset=utf-8')
        response.write(`{
          "errors": {
            "email": "invalid"
          }
        }`)
      }
      else if (password !== password_confirm) {
        response.statusCode = 400
        response.write(`The password not match`)
      }
      else {
        let users = fs.readFileSync('./database/users', 'utf8')
        try {
          users = JSON.parse(users)  //[]
        } catch (exception) {
          users = []
        }
        let inUse = false
        for (let i = 0; i < users.length; i++) {
          let user = users[i]
          if (user.email === email) {
            inUse = true
            break
          }
        }
        if (inUse)
        {
          response.statusCode = 400
          response.write(`This email is in Use`)
        }
        else{
          users.push({email: email, password: password})
          let userString = JSON.stringify(users)
          fs.writeFileSync('./database/users', userString)
          response.statusCode = 200
        }
      }
      response.end()
    })
  }
  else if (path === './style.css') {
    var string = fs.readFileSync('./style.css', 'utf8')
    response.setHeader('Content-Type', 'text/css')
    response.write(string)
    response.end()
  }
  else if (path === '/sign_in' && method === 'GET') {
    let string = fs.readFileSync('./sign_in.html','utf8')
    response.statusCode = 200
    response.write(string)
    response.end()
  }
  else if (path === '/sign_in' && method === 'POST')
  {
    readBody(request).then((body) => {
      let strings = body.split('&')
      let hash = {}
      strings.forEach((string) => {
        let parts = string.split('=')  //['email','1']
        let key = parts[0]
        let value = parts[1]
        hash[key] = decodeURIComponent(value)
        //李爵士不允许在value中有@符号出现，所以一般这里面都会被转化成%40
      })
      /*let email = hash['emial']
      let password = hash['password']
      let password = hash['password_confirm']*/
      let {email, password} = hash
      console.log('email:' + email)
      console.log('password: ' + password)

      var users = fs.readFileSync('./database/users', 'utf8')
      try {
        users = JSON.parse(users)  //[]
      } catch (exception) {
        users = []
      }
      let found
      for (let i = 0; i<users.length;i++)
      {
        if(users[i].email === email && users[i].password === password)
        {
          found = true
          break
        }
      }
      if (found)
      {
        response.setHeader('Set-Cookie',`sign_in_email = ${email};HttpOnly`)
        response.statusCode = 200
      }
      else {
        response.statusCode = 401
      }

      response.end()
    })
  }
  else if (path === './main.js') {
    var string = fs.readFileSync('./main.js', 'utf8')
    response.setHeader('Content-Type', 'application/javascript')
    response.write(string)
    response.end()
  }
  else if (path === '/pay') {
    let amount = fs.readFileSync('./db', 'utf8')
    amount = amount - 1
    fs.writeFileSync('./db', amount)
    response.setHeader('Content-Type', 'application/javascript')
    response.statusCode = 200
    //response.write(`amount.innerText =  amnount.innerText - 1`)
    //说明happy.com的程序员要对ebony.com的页面细节很了解
    //耦合  关系太紧密   解耦 调用函数（一般）
    //JSON + padding = JSONP  STRING + padding = STRINGP
    response.write(`
        ${query.callback}.call(undefined,{
        "success": true,
        "left": ${newAmount}
        })
        `)
    response.end()
  }
  else {
    response.statusCode = 404
    response.setHeader('Content-Type', 'text/html;charset=utf-8')
    response.write('找不到对应的路径，需要自行修改index.js')
    response.end()
  }
})

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = []
    request.on('data', (chunk) => {
      body.push(chunk)
    }).on('end', () => {
      body = Buffer.concat(body).toString()
      resolve(body)
    })
  })
}

server.listen(port)
console.log('监听 ' + port + ' 成功\n请用在空中转体720度然后用电饭煲打开 http://localhost:' + port)
