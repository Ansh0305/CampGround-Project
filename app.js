const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const ejsMate = require("ejs-mate");
// const Joi = require('joi');
const {campgroundSchema, reviewSchema} = require('./schemas.js')
const catchAsync = require('./Utilities/AsyncCatch');
const ExpressError = require('./Utilities/ExpressError')
const methodOverride = require("method-override");
const Campground = require("./models/campground");
// const { title } = require("process");
const Review = require('./models/review');


mongoose.connect("mongodb://localhost:27017/yelp-camp");

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
  console.log("Database connected");
});

const app = express();

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

const validateCampgound = (req, res, next) => {

  const { error } = campgroundSchema.validate(req.body);
  if (error) {
    const msg = error.details.map(el => el.message).join(","); // el => eachelement
    throw new ExpressError(msg, 400);
  }else{
    next();
  }
  // console.log(error);
}

const validateReview = (req, res, next) => {
  const {error} = reviewSchema.validate(req.body);
  if (error) {
    const msg = error.details.map(el => el.message).join(",") // el => eachelement
    throw new ExpressError(msg, 400);
  } else {
    next();
  }
}

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/campgrounds", catchAsync(async (req, res) => {
  const campgrounds = await Campground.find({});
  res.render("campgrounds/index", { campgrounds });
}));

app.get("/campgrounds/new", (req, res) => {
  res.render("campgrounds/new");
});

app.post("/campgrounds", validateCampgound, catchAsync(async (req, res) => {
    // if(!req.body.campground) throw new ExpressError('INVALID CAMPGROUND DATA', 400)
    const campground = new Campground(req.body.campground);
    await campground.save();
    res.redirect(`/campgrounds/${campground._id}`);
  })
);

app.get("/campgrounds/:id", catchAsync(async (req, res) => {
  const campground = await Campground.findById(req.params.id).populate('reviews');
  console.log(campground);
  res.render("campgrounds/show", { campground });
}));

app.get("/campgrounds/:id/edit", catchAsync(async (req, res) => {
  const campground = await Campground.findById(req.params.id);
  res.render("campgrounds/edit", { campground });
}));

app.put("/campgrounds/:id", validateCampgound, catchAsync(async (req, res) => {
    const { id } = req.params;
    const campground = await Campground.findByIdAndUpdate(id, {
      ...req.body.campground,
    });
    res.redirect(`/campgrounds/${campground._id}`);
  })
);

app.delete("/campgrounds/:id", catchAsync(async (req, res) => {
  const { id } = req.params;
  await Campground.findByIdAndDelete(id);
  res.redirect("/campgrounds");
}));

app.post('/campgrounds/:id/reviews',validateReview, catchAsync(async (req,res) => {
  const campground = await Campground.findById(req.params.id);
  const review = new Review(req.body.review);
  campground.reviews.push(review);
  await review.save();
  await campground.save();
  res.redirect(`/campgrounds/${campground._id}`);
}))

app.delete('/campgrounds/:id/reviews/:reviewId', catchAsync(async (req, res) => {
  const {id, reviewId} = req.params;
  await Campground.findByIdAndUpdate(id, {$pull: {review: reviewId}})
  await Review.findByIdAndDelete(reviewId);
  res.redirect(`/campgrounds/${id}`);
  // res.send('YAHOO')
}))


// Must be below all other request similar to listen and use
app.all(/(.*)/, (req, res, next) => {
  next(new ExpressError('Page Not Found', 404))
});

app.use((err, req, res, next) => {
  const {statusCode = 500} = err;
  if (!err.message) err.message = 'Something Went Wrong!'
  res.status(statusCode).render('error', {err})
  // res.send('Something went wrong!')
})

app.listen(3000, () => {
  console.log("APP LISTENING AT PORT 3000 ");
});
