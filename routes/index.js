const moviesRouter = require('./movies');
const { usersRouter,loginRouter} = require('./users')


const setupRoutes = (app) => {
   
   app.use('/api/movies', moviesRouter);

   app.use('/api/users', usersRouter);

   app.use('/api/auth', loginRouter);
   
}

module.exports={setupRoutes}