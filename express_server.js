const express = require("express");
const bodyParser = require("body-parser");
const bcrypt = require("bcrypt");
const cookieSession = require("cookie-session");
const methodOverride = require('method-override');

let PORT = process.env.PORT || 8080;

const characterString = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const errorNotLoggedIn = '<html><body>You are not logged in <a href="/login"> Log in here </a></body></html>\n'

const urlDatabase = {
  "b2xVn2": {
    "b2xVn2": "http://www.lighthouselabs.ca",
    userId: "userRandomID",
    visits: 0,
    uniqueVisits: 0,
    record: []
  },
  "9sm5xK" : {
    "9sm5xK": "http://www.google.com",
    userId: "user2RandomID",
    visits: 0,
    uniqueVisits: 0,
    record: []
  }
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: bcrypt.hashSync("1234", 10)
  },
 "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: bcrypt.hashSync("lolo", 10)
  }
};

const app = express();
app.set("view engine", "ejs");

// Middlewares
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: "session",
  keys: ["secret"]
}));
app.use(methodOverride('_method'));

function generateRandomString() {
  return new Array(6).join(',').split(',').map(function() {
    return characterString.charAt(Math.floor(Math.random() * characterString.length));
  }).join('');
}

function ensureHTTP(input) {
  if (!(input.startsWith("http://")) && !(input.startsWith("https://"))) {
    input = "http://" + input;
  }
  return input;
}

function findUserUrls(userId) {
  let userUrls = {};
  for (let url in urlDatabase) {
    if (urlDatabase[url].userId === userId) {
      userUrls[url] = urlDatabase[url];
    }
  }
  return userUrls;
}

// helper function / middleware checks existence and authorization to modify url

function checkUrlEdit(req, res, next) {
  if (!urlDatabase[req.params.id]) {
    res.status(404).send("URL does not exist");
  } else if (urlDatabase[req.params.id].userId !== req.session.userId) {
    res.status(403).send("You are not authorized to modify this URL");
  } else {
    next();
  }
}

// helper function / middleware checks if is user is logged in

function checkLogin(req, res, next) {
  if (!req.session.userId) {
    res.status(401).send(errorNotLoggedIn);
  } else {
    next();
  }
}

app.get("/urls", checkLogin, (req, res) => {
  let userUrls = findUserUrls(req.session.userId);
  let templateVars = {
    user: users[req.session.userId],
    urls: userUrls
  };
  res.render("urls_index", templateVars);
});

app.post("/urls", checkLogin, (req, res) => {
  if (req.body.longURL) {
    let shortURL = generateRandomString();
    let longURL = ensureHTTP(req.body.longURL);
    urlDatabase[shortURL] = {
      [shortURL]: longURL,
      userId: req.session.userId,
      visits: 0,
      uniqueVisits: 0,
      record: []
    };
    res.redirect(`/urls/${shortURL}`);
  } else {
    res.redirect("/urls/new");
  }
});

app.get("/urls/new", checkLogin, (req, res) => {
  let templateVars = {
    user: users[req.session.userId]
  };
  res.render("urls_new", templateVars);
});

app.get("/urls/:id", checkLogin, checkUrlEdit, (req, res) => {
  let templateVars = {
    user: users[req.session.userId],
    url: urlDatabase[req.params.id],
    shortURL: req.params.id
  };
  console.log(templateVars);
  res.render("urls_show", templateVars);
});

app.put("/urls/:id", checkLogin, checkUrlEdit, (req, res) => {
  if (req.body.update) {
    let update = ensureHTTP(req.body.update);
    urlDatabase[req.params.id][req.params.id] = update;
  }
  res.redirect(`/urls/${req.params.id}`);
});

app.delete("/urls/:id/delete", checkLogin, checkUrlEdit, (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect("/urls");
});

app.get("/login", (req, res) => {
  if (req.session.userId) {
    res.redirect("/");
  } else {
    let templateVars = { user : null };
    res.render("login_form", templateVars);
  }
});

app.post("/login", (req, res) => {
  for (let user in users) {
    if (req.body.email === users[user].email) {
      if (bcrypt.compareSync(req.body.password, users[user].password)) {
        req.session.userId = user;
        res.redirect("/");
        return;
      } else {
        break;
      }
    }
  }
  res.status(401).send("Invalid credentials.");
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/");
});

app.get("/u/:shortURL", (req, res) => {
  if (!urlDatabase[req.params.shortURL]) {
    res.status(404).end('<html><body>Url does not exist</body></html>\n');
  } else {
    let urlId = req.params.shortURL;
    if (!req.session[urlId]) {
      urlDatabase[urlId].uniqueVisits += 1;
      req.session[urlId] = generateRandomString();
      urlDatabase[urlId].record.push({
        id: req.session.userId,
        unique: true,
        timestamp: new Date()
      });
    } else {
      urlDatabase[urlId].record.push({
        id: req.session.userId,
        unique: false,
        timestamp: new Date()
      });
    }
    let longURL = urlDatabase[req.params.shortURL][req.params.shortURL];
    urlDatabase[req.params.shortURL].visits += 1;
    res.redirect(longURL);
  }
});

app.post("/register", (req, res) => {
  let error = false;
  if (!req.body.email || !req.body.password) {
    error = true;
    res.status(400).end("Email and password are required");
  }
  for (var userId in users) {
    if (users[userId].email === req.body.email) {
      error = true;
      res.status(400).end("Email already used");
    }
  }
  if (!error) {
    let newUserId = generateRandomString();
    const password = req.body.password;
    const hashedPassword = bcrypt.hashSync(password, 10);
    users[newUserId] = {
      id: newUserId,
      email: req.body.email,
      password: hashedPassword
    };
    req.session.userId = newUserId;
    res.redirect("/");
  }
});

app.get("/register", (req, res) => {
  if (req.session.userId) {
    res.redirect("/");
  } else {
    let templateVars = { user : null };
    res.render("register_form", templateVars);
  }
});

app.get("/", (req, res) => {
  if (req.session.userId) {
    res.redirect("/urls");
  } else {
    res.redirect("/login");
  }
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/hello", (req, res) => {
  res.end("<html><body>Hello <b>World</b></body></html>\n");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
