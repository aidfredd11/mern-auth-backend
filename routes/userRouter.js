const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const auth = require("../middleware/auth");
const User = require("../models/userModel");

router.post("/register", async (req, res) => {
  try {
    let { email, password, passwordCheck, firstName, lastName } = req.body;
    console.log(req.body);

    // validate

    if (!email || !password || !passwordCheck || !firstName || !lastName)
      return res.status(400).json({ msg: "Not all fields entered." });
    if (password.length < 5)
      return res.status(400).json({ msg: "Password minumum 5 characters." });
    if (password !== passwordCheck)
      return res.status(400).json({ msg: "Passwords do not match." });

    const existingUser = await User.findOne({ email: email });
    if (existingUser)
      return res.status(400).json({ msg: "Email already in use." });

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = new User({
      email,
      password: passwordHash,
      firstName,
      lastName,
    });
    const savedUser = await newUser.save();
    res.json(savedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    //validate
    if (!email || !password)
      return res.status(400).json({ msg: "Not all fields entered." });

    const user = await User.findOne({ email: email });
    if (!user) return res.status(400).json({ msg: "Account not found." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: "Invalid password." });

    const token = jwt.sign({id: user._id}, process.env.JWT_SECRET);
    res.json({
        token,
        user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
        },
    })
    
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// private route
router.delete("/delete", auth, async (req,res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.user);
    res.json(deletedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tokenIsValid", async (req, res) =>{
  try {
    const token = req.header("x-auth-token");
    if(!token) return res.json(false);

    const verified = jwt.verify(token, process.env.JWT_SECRET); 
    if(!verified) return res.json(false);

    const user = await User.findById(verified.id);
    if(!user) return res.json(false);

    return res.json(true);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", auth, async (req,res) => {
  const user = await User.findById(req.user);
  res.json({
    firstName: user.firstName,
    lastName: user.lastName,
    id: user._id,
  });
});

module.exports = router;
