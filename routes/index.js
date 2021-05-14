const express = require("express");
const {
  login,
  logout,
  isLoggedIn,
  forgot,
  reset,
  confirmedPasswords,
  update
} = require("../controllers/authController");
const { addReview } = require("../controllers/reviewController");
const {
  getStores,
  addStore,
  createStore,
  editStore,
  updateStore,
  getStoreBySlug,
  getStoresByTag,
  upload,
  resize,
  searchStores,
  mapStores,
  getMap,
  heartsStore,
  getHearts,
  getTopStores
} = require("../controllers/storeController");
const {
  loginForm,
  registerForm,
  validateRegister,
  register,
  account,
  updateAccount
} = require("../controllers/userController");
const { catchErrors } = require("../handlers/errorHandlers");
const router = express.Router();

// Homepage
router.get("/", catchErrors(getStores));

// Stores
router.get("/stores", catchErrors(getStores));
router.get("/stores/page/:page", catchErrors(getStores));

// Store Detail Page
router.get("/store/:slug", catchErrors(getStoreBySlug));

// Add Store
router.get("/add", isLoggedIn, addStore);
router.post("/add", upload, catchErrors(resize), catchErrors(createStore));

// Edit Store
router.get("/stores/:id/edit", catchErrors(editStore));
router.post("/add/:id", upload, catchErrors(resize), catchErrors(updateStore));

// Tags
router.get("/tags", catchErrors(getStoresByTag));
router.get("/tags/:tag", catchErrors(getStoresByTag));

// User login & register
router.get("/login", loginForm);
router.post("/login", login);
router.get("/register", registerForm);

// user forgot password
router.post("/account/forgot", catchErrors(forgot));

// reset password
router.get("/account/reset/:token", catchErrors(reset));
router.post("/account/reset/:token", confirmedPasswords, catchErrors(update));

// 1. validate the registration data
// 2. register the user
// 3. we need to log them in
router.post("/register", validateRegister, register, login);

// log user out
router.get("/logout", logout);

// edit user account
router.get("/account", account);
router.post("/account", catchErrors(updateAccount));

// map
router.get("/map", getMap);

// hearted stores
router.get("/hearts", isLoggedIn, catchErrors(getHearts));

// add review
router.post("/reviews/:id", isLoggedIn, catchErrors(addReview));

// top stores
router.get("/top", catchErrors(getTopStores));

// API
router.get("/api/search", catchErrors(searchStores));
router.get("/api/stores/near", catchErrors(mapStores));
router.post("/api/stores/:id/heart", catchErrors(heartsStore));

module.exports = router;
