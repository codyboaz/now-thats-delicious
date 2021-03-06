const mongoose = require("mongoose");
const Store = mongoose.model("Store");
const User = mongoose.model("User");
const multer = require("multer");
const jimp = require("jimp");
const uuid = require("uuid");

const multerOptions = {
  storage: multer.memoryStorage(),
  fileStorage(req, file, next) {
    const isPhoto = file.mimetype.startsWith("image/");
    if (isPhoto) {
      next(null, true);
    } else {
      next({ message: "That filetype isn't allowed!" }, false);
    }
  }
};

exports.myMiddleWare = (req, res, next) => {
  next();
};

exports.homePage = (req, res) => {
  res.render("index", {
    title: "I love food!"
  });
};

exports.addStore = (req, res) => {
  res.render("editStore", {
    title: "Add Store"
  });
};

exports.upload = multer(multerOptions).single("photo");

exports.resize = async (req, res, next) => {
  // Check if there is no new file to resize
  if (!req.file) {
    next(); // skip to next middleware
    return;
  }
  console.log(req.file);
  const extension = req.file.mimetype.split("/")[1];
  req.body.photo = `${uuid.v4()}.${extension}`;
  // Now we resize
  const photo = await jimp.read(req.file.buffer);
  await photo.resize(800, jimp.AUTO);
  await photo.write(`./public/uploads/${req.body.photo}`);
  // Once we have written the photo to our filesystem, keep going!
  next();
};

exports.createStore = async (req, res) => {
  req.body.author = req.user._id;
  const store = await new Store(req.body).save();
  req.flash(
    "success",
    `Successfully created store ${store.name}. Care to leave a review?`
  );
  res.redirect(`/store/${store.slug}`);
};

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 4;
  const skip = page * limit - limit;

  // 1. Query the database for a list of all stores
  const storesPromise = Store.find()
    .skip(skip)
    .limit(limit)
    .sort({ created: "desc" });

  const countPromise = Store.count();

  const [stores, count] = await Promise.all([storesPromise, countPromise]);
  const pages = Math.ceil(count / limit);
  if (!stores.length && skip) {
    req.flash(
      "info",
      `Hey you aksed for page ${page}. But that doesn't exist. So I put you on page ${pages}.`
    );
    res.redirect(`/stores/page/${pages}`);
    return;
  }
  res.render("stores", { title: "Stores", stores, page, pages, count });
};

exports.getStoreBySlug = async (req, res, next) => {
  // 1. Query the database for the store
  const store = await Store.findOne({ slug: req.params.slug }).populate(
    "author reviews"
  );
  // 2. If store does not exist, send to 404 page
  if (!store) {
    next();
  }
  // 3. Render the store
  res.render("store", { title: store.name, store });
};

const confirmOwner = (store, user) => {
  if (!store.author.equals(user._id)) {
    throw Error("You must own a store in order to edit it!");
  }
};

exports.editStore = async (req, res) => {
  // 1. Find the store given the ID
  const store = await Store.findOne({ _id: req.params.id });
  // 2. Confirm they are the owner of the store
  confirmOwner(store, req.user);
  // 3. Render out the edit form so the user can updae their store
  res.render("editStore", { title: "Edit Store", store });
};

exports.updateStore = async (req, res) => {
  // 1. Set the location data to be a "Point"
  req.body.location.type = "Point";
  // 2. Find and update store
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // returns the new store instead of the old one
    runValidators: true
  });
  req.flash(
    "success",
    `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store</a>`
  );
  // 3. Redirect them to the store and tell them it worked.
  res.redirect(`/stores/${store._id}/edit`);
};

exports.getStoresByTag = async (req, res) => {
  const tag = req.params.tag;
  const tagQuery = tag || { $exists: true };
  const tagsPromise = Store.getTagsList();
  const storesPromise = Store.find({ tags: tagQuery });
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
  res.render("tag", { title: "Tags", tags, tag, stores });
};

exports.searchStores = async (req, res) => {
  const stores = await Store
    // first find stores that match
    .find(
      {
        $text: {
          $search: req.query.q
        }
      },
      {
        score: { $meta: "textScore" }
      }
    )
    // then sort them
    .sort({
      score: { $meta: "textScore" }
    })
    // limit to only 5 results
    .limit(5);
  res.json(stores);
};

exports.mapStores = async (req, res) => {
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const q = {
    location: {
      $near: {
        $geometry: {
          type: "Point",
          coordinates
        },
        $maxDistance: 10000 // 10km
      }
    }
  };

  const stores = await Store.find(q).select(
    "slug name description location photo"
  );
  res.json(stores);
};

exports.getMap = (req, res) => {
  res.render("map", { title: "Map" });
};

exports.heartsStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  const operator = hearts.includes(req.params.id) ? "$pull" : "$addToSet";
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      [operator]: { hearts: req.params.id }
    },
    { new: true }
  );
  res.json(user);
};

exports.getHearts = async (req, res) => {
  const stores = await Store.find({
    _id: {
      $in: req.user.hearts
    }
  });
  res.render("stores", { title: "Hearted Stores", stores });
};

exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();
  res.render("topStores", { stores, title: "Top Stores" });
};
