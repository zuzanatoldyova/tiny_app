const express = require('express');
const app = express();
let PORT = process.env.PORT || 8080; // default port 8080
const bodyParser = require("body-parser");
const morgan = require('morgan');
const cookieParser = require('cookie-parser')

const s = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const urlDatabase = {
  'b2xVn2': 'http://www.lighthouselabs.ca',
  '9sm5xK': 'http://www.google.com'
};

app.set('view engine', 'ejs');

// Middlewares
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());


app.get('/urls', (req, res) => {
  let templateVars = {
    username: req.cookies["name"],
    urls: urlDatabase
  };
  res.render('urls_index', templateVars);
});

app.post("/urls", (req, res) => {
  let shortURL = generateRandomString();
  if (req.body.longURL) {
    let update = checkHTTP(req.body.longURL);
    urlDatabase[shortURL] = update;
    res.redirect("/urls");
  } else {
    res.redirect("/urls/new");
  }
});

app.get("/urls/new", (req, res) => {
  let templateVars = {
    username: req.cookies["name"]
  }
  res.render("urls_new", templateVars);
});

app.get("/urls/:id", (req, res) => {
  let templateVars = {
    username: req.cookies["name"],
    shortURL: req.params.id,
    fullURL: urlDatabase[req.params.id]
   };
   console.log(templateVars);
  res.render("urls_show", templateVars);
});

app.post("/urls/:id", (req, res) => {
  let update = checkHTTP(req.body.update);
  urlDatabase[req.params.id] = update;
  res.redirect("/urls"); // will change later
});

app.post("/urls/:id/delete", (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect("/urls");
});

app.post("/login", (req, res) => {
  res.cookie("name", req.body.username);
  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  res.clearCookie("name");
  res.redirect("/urls");
});

app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL];
  if (!longURL) {
    res.status(404).end('<html><body>url does not exist</body></html>\n');
  } else {
    res.redirect(longURL);
  }
});

app.get('/', (req, res) => {
  res.end('Hello!');
});

app.get('/urls.json', (req, res) => {
  res.json(urlDatabase);
});

app.get('/hello', (req, res) => {
  res.end('<html><body>Hello <b>World</b></body></html>\n');
});

function generateRandomString() {
  return Array(6).join().split(',').map(function() {
    return s.charAt(Math.floor(Math.random() * s.length));
  }).join('');
}

function checkHTTP(input) {
  if (input.substring(0, 7) !== 'http://' && input.substring(0, 8) !== 'https://') {
    input = 'http://' + input;
  }
  return input;
}

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
