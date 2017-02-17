const express = require('express');
const app = express();
let PORT = process.env.PORT || 8080; // default port 8080
const bodyParser = require("body-parser");
const morgan = require('morgan');
const cookieParser = require('cookie-parser')
const bcrypt = require('bcrypt');

const s = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const urlDatabase = {
  "b2xVn2": {
    "b2xVn2": "http://www.lighthouselabs.ca",
    userId: "userRandomID"
  },
  "9sm5xK" : {
    "9sm5xK": "http://www.google.com",
    userId: "user2RandomID"
  }
};

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: bcrypt.hashSync("purple-monkey-dinosaur", 10)
  },
 "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: bcrypt.hashSync("dishwasher-funk", 10)
  }
};

const errorNotLoggedIn = '<html><body>You are not logged in <a href="/login"> Log in here </a></body></html>\n'
// const loggedIn = req.cookies.userId;

app.set('view engine', 'ejs');

// Middlewares
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());


app.get("/urls", (req, res) => {
  if (req.cookies.userId) {
    let userUrls = findUserUrls(req.cookies.userId);
    let templateVars = {
      user: users[req.cookies.userId],
      urls: userUrls
    };
    res.render('urls_index', templateVars);
  } else {
    res.status(401).send(errorNotLoggedIn);
  }
});

app.post("/urls", (req, res) => {
  if (req.cookies.userId) {
    if (req.body.longURL) {
      let shortURL = generateRandomString();
      let longURL = checkHTTP(req.body.longURL);
      urlDatabase[shortURL] = {
        [shortURL]: longURL,
        userId: req.cookies.userId
      };
      console.log(shortURL);
      res.redirect(`/urls/${shortURL}`);
    } else {
      res.redirect("/urls/new");
    }
  } else {
    res.status(401).send(errorNotLoggedIn);
  }
});

app.get("/urls/new", (req, res) => {
  if (req.cookies.userId) {
    let templateVars = {
      user: users[req.cookies.userId]
    }
    res.render("urls_new", templateVars);
    return;
  }
  res.status(401).send(errorNotLoggedIn);
});

app.get("/urls/:id", (req, res) => {
  // checkUrlEdit(req, res, showUrl(req, res));
  if (req.cookies.userId) {
    if (urlDatabase[req.params.id]) {
      if (urlDatabase[req.params.id].userId === req.cookies.userId) {
        let templateVars = {
          user: users[req.cookies.userId],
          shortURL: req.params.id,
          fullURL: urlDatabase[req.params.id][req.params.id]
         };
        res.render("urls_show", templateVars);
        return;
      }
      res.status(403).send("You are not authorized to modify this URL");
      return;
    }
    res.status(404).send("URL does not exist");
    return;
  }
  res.status(401).send(errorNotLoggedIn);
});

app.post("/urls/:id", (req, res) => {
  // checkUrlEdit(req, res, updateDatabase(req, res));
  if (req.cookies.userId) {
    if (urlDatabase[req.params.id]) {
      if (urlDatabase[req.params.id].userId === req.cookies.userId) {
        if (req.body.update) {
          let update = checkHTTP(req.body.update);
          urlDatabase[req.params.id] = {
            [req.params.id]: update,
            userId: req.cookies.userId
          };
          res.redirect("/urls");
          return;
        }
        res.redirect(`/urls/${req.params.id}`);
        return;
      }
      res.status(403).send("You are not authorized to modify this URL");
      return;
    }
    res.status(404).send("URL does not exist");
    return;
  }
  res.status(401).send(errorNotLoggedIn);
});

app.post("/urls/:id/delete", (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect("/urls");
});

app.get("/login", (req, res) => {
  if (req.cookies.userId) {
    res.redirect("/");
  } else {
    res.render("login_form"); //or home?
  }
});

app.post("/login", (req, res) => {
  for (let user in users) {
    if (req.body.email === users[user].email) {
      if (bcrypt.compareSync(req.body.password, users[user].password)) {
        res.cookie("userId", user);
        res.redirect("/"); //or home?
        return;
      }
    }
  }
  res.status(401).send("Invalid credentials.");
});

app.post("/logout", (req, res) => {
  res.clearCookie("userId");
  res.redirect("/"); //or home?
});

app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL][req.params.shortURL];
  if (!longURL) {
    res.status(404).end('<html><body>Url does not exist</body></html>\n');
  } else {
    res.redirect(longURL);
  }
});

app.post("/register", (req, res) => {
  let mistake = false;
  if (!req.body.email || !req.body.password) {
    mistake = true;
    res.status(400).end("Email and password are required");
  }
  for (var userId in users) {
      if (users[userId].email === req.body.email) {
        mistake = true;
        res.status(400).end("Email already used");
    }
  }
  if (!mistake) {
    let newUserId = generateRandomString();
    const password = req.body.password;
    const hashedPassword = bcrypt.hashSync(password, 10);
    users[newUserId] = {
      id: newUserId,
      email: req.body.email,
      password: hashedPassword
    };
    res.cookie("userId", newUserId);
    res.redirect("/");
  }
});

app.get("/register", (req, res) => {
  if (req.cookies.userId) {
    res.redirect("/");
  } else {
    res.render("register_form");
  }
});

app.get("/", (req, res) => {
  if (req.cookies.userId) {
    res.redirect("/urls");
    return;
  }
  res.redirect("/login");
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

function findUserUrls(userId) {
  let userUrls = {};
  if (!userId) {
    return undefined;
  }
  for (let url in urlDatabase) {
    if (urlDatabase[url].userId === userId) {
      userUrls[url] = urlDatabase[url];
    }
  }
  return userUrls;
}

// // helper function used in /urls/:id post and get request, checking sign in, existence of url and authorization to modify url

// function checkUrlEdit(req, res, callback) {
//   if (!req.cookies.userId) {
//     res.status(401).send(errorNotLoggedIn);

//   } else if (!urlDatabase[req.params.id]) {
//     res.status(404).send("URL does not exist");
//   } else if (! urlDatabase[req.params.id].userId === req.cookies.userId) {
//     res.status(403).send("You are not authorized to modify this URL");
//   } else {
//     callback;
//   }
// }

// // helper function in /urls/:id send request, updates url in database

// function updateDatabase(req, res) {
//   if (req.body.update) {
//     let update = checkHTTP(req.body.update);
//     urlDatabase[req.params.id] = {
//       [req.params.id]: update,
//       userId: req.cookies.userId
//     };
//     res.redirect("/urls");
//   } else {
//   res.redirect(`/urls/${req.params.id}`);
//   }
// }

// // helper function in /urls/:id get request, setts parameters and render approtpriate url

// function showUrl(req, res) {
//   let templateVars = {
//     user: users[req.cookies.userId],
//     shortURL: req.params.id,
//     fullURL: urlDatabase[req.params.id][req.params.id]
//   };
//   res.render("urls_show", templateVars);
// }

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
