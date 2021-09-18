const moviesRouter = require('express').Router();
const connection = require("../db-config");
const Joi = require("joi");


// GET Route (Get all movie's information)

moviesRouter.get("/", (req, res) => {
  let sql = "SELECT * FROM movies";
  const sqlValues = [];
  if (req.query.color) {
    sql += " WHERE color = ?";
    sqlValues.push(req.query.color);
  }
  if (req.query.max_duration) {
    if (req.query.color) sql += " AND duration <= ? ;";
    else sql += " WHERE duration <= ?";

    sqlValues.push(req.query.max_duration);
  }

  connection.query(sql, sqlValues, (err, results) => {
    if (err) {
      console.log(err);
      res.status(500).send("Error retrieving movies from database");
    } else {
      res.json(results);
    }
  });
});

moviesRouter.get("/", (req, res) => {
  const movieId = req.params.id;
  connection.query(
    "SELECT * FROM movies WHERE id = ?",
    [movieId],
    (err, results) => {
      if (err) {
        res.status(500).send("Error retrieving movie from database");
      } else {
        if (results.length) res.json(results[0]);
        else res.status(404).send("Movie not found");
      }
    }
  );
});



// POST Route (validate the inputs and then inser the new mivie to the database )

moviesRouter.post("/", async (req, res) => {
  const { title, director, year, color, duration } = req.body;
  const db = connection.promise();
  let validationErrors = null;

  try {
    validationErrors = Joi.object({
      title: Joi.string().max(255).required(),
      director: Joi.string().max(255).required(),
      year: Joi.number().greater(1887).required(),
      color: Joi.boolean().required(),
      duration: Joi.number().required(),
    }).validate(
      { title, director, year, color, duration },
      { abortEarly: false }
    ).error;

    if (validationErrors) return await Promise.reject("INVALID_DATA");

    const [moviedata] = await db.query(
      "INSERT INTO movies (title, director, year, color, duration) VALUES (?, ?, ?, ?, ?)",
      [title, director, year, color, duration]
    );
    console.log(moviedata);

    if (moviedata) {
      const id = moviedata.insertId;
      const createdMovie = { id, title, director, year, color, duration };
      res.status(201).json(createdMovie);
    }
  } catch (err) {
    const message = validationErrors.details[0].message;
    if (err === "INVALID_DATA") res.status(422).json({ message });
    else {
      res.status(500).send("Error saving the user");
    }
  }
});



// PUT route (Edit the movie only if the movie exists)
moviesRouter.put("/:id", async (req, res) => {
  const { title, director, year, color, duration } = req.body;
  const movieId = req.params.id;
  const db = connection.promise();
  let existingMovie = null;

  let validationErrors = null;

  try {
    validationErrors = Joi.object({
      title: Joi.string().optional().max(255),
      director: Joi.string().optional().max(255),
      year: Joi.number().optional().greater(1887),
      color: Joi.boolean().optional(),
      duration: Joi.number().optional(),
    }).validate(
      { title, director, year, color, duration },
      { abortEarly: false }
    ).error;

    if (validationErrors) return await Promise.reject("INVALID_DATA");

    const [data] = await db.query("SELECT * FROM movies WHERE id = ?", [
      movieId,
    ]);
    if ([data]) {
      existingMovie = data[0];
      if (!existingMovie) return Promise.reject("RECORD_NOT_FOUND");
      else {
        await db.query("UPDATE movies SET ? WHERE id = ?", [req.body, movieId]);
        res.status(200).json({ ...existingMovie, ...req.body });
      }
    }
  } catch (err) {
    console.error(err);
    if (err === "RECORD_NOT_FOUND") {
      res.status(404).send(`Movie with id ${movieId} not found.`);
    } else if (err === "INVALID_DATA") {
      res.status(404).json({ validationErrors });
    } else {
      res.status(500).send("Error updating a movie.");
    }
  }
});

moviesRouter.delete("/", (req, res) => {
  const movieId = req.params.id;
  connection.query(
    "DELETE FROM movies WHERE id = ?",
    [movieId],
    (err, result) => {
      if (err) {
        console.log(err);
        res.status(500).send("Error deleting a movie");
      } else {
        if (result.affectedRows) res.status(200).send("🎉 Movie deleted!");
        else res.status(404).send("Movie not found");
      }
    }
  );
});
module.exports = moviesRouter;
