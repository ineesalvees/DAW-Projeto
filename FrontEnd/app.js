var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// Módulos de suporte à autenticação
var uuid = require('uuid/v4')
var session = require('express-session')
var FileStore = require('session-file-store')(session)

var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy
var axios = require('axios')
var flash = require('connect-flash')
var bcrypt = require('bcryptjs')
var jwt = require('jsonwebtoken')
//-----------------------------------

// Configuração da estratégia local
passport.use(new LocalStrategy(
  {usernameField: 'email'}, (email, password, done) => {
  var token = jwt.sign({}, "daw2019", 
    {
        expiresIn: 3000, 
        issuer: "Servidor myAgenda"
    })
  axios.get('http://localhost:5003/utilizadores/' + email + '?token=' + token)
    .then(dados => {
      const user = dados.data
      if(!user) { return done(null, false, {message: 'Utilizador inexistente!\n'})}
      if(!bcrypt.compareSync(password, user.password)) { return done(null, false, {message: 'Password inválida!\n'})}
      return done(null, user)
  })
  .catch(erro => done(erro))
}))

// Indica-se ao passport como serializar o utilizador
passport.serializeUser((user,done) => {
  console.log('Vou serializar o user: ' + JSON.stringify(user))
  // Serialização do utilizador. O passport grava o utilizador na sessão aqui.
  done(null, user.email)
})
  
// Desserialização: a partir do id obtem-se a informação do utilizador
passport.deserializeUser((email, done) => {
  var token = jwt.sign({}, "daw2019", 
    {
        expiresIn: 3000, 
        issuer: "Servidor myAgenda"
  })
  console.log('Vou desserializar o utilizador: ' + email)
  axios.get('http://localhost:5003/utilizadores/' + email + '?token=' + token)
    .then(dados => done(null, dados.data))
    .catch(erro => done(erro, false))
})

var indexRouter = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(session({
  genid: req => {
    console.log('Dentro do middleware da sessão...')
    console.log(req.sessionID)
    return uuid()
  },
  store: new FileStore(),
  secret: 'pri2019',
  resave: false,
  saveUninitialized: true
}))

app.use(passport.initialize());
app.use(passport.session());
  
app.use(flash());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
console.log("\n\nDIRNAME :: " + __dirname)
console.log("JUNTÇÂO: " + path.join(__dirname, 'public'))
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  console.log("BAD TRIP ")
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
