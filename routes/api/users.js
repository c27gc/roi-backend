const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const keys = require("../../config/keys");
const passport = require("passport");
const { ethers } = require("ethers");
const {
  providers,
  ticketNFTContract,
  supportChainId,
} = require("../../contracts/index");
//for paypal
const http = require("http");
const paypal = require("paypal-rest-sdk");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");
const location = require("location-href");

require("dotenv").config();
const stripe = require("stripe")(
  "sk_test_51IIG9OFnB9XCFR50eRaZ3PAvT46VTx0ksujla3jdReYQfT0SYiB1ewoPQN1D8ZSxyvvHOfzqfaxfsiKYe9Io6VZs00t55VzRw1"
);

router.use(cors());

//blockchain assets
const adminWallet = new ethers.Wallet(
  process.env.PRIVATE_KEY,
  providers[supportChainId]
);
const signedTicketNFTContract = ticketNFTContract.connect(adminWallet);

// Load input validation
const validateRegisterInput = require("../../validation/register");
const validateLoginInput = require("../../validation/login");

// Load User model
const User = require("../../models/User");

// Load Token model
const Token = require("../../models/Token");

//paypal configure
const client_id = process.env.PAYPAL_CLIENTID;
const secret = process.env.PAYPAL_SECRET;
const paypal_account = process.env.PAYPAL_ACCOUNT;

paypal.configure({
  mode: paypal_account, //sandbox or live
  client_id: client_id,
  client_secret: secret,
});

var userID;
var userAmount;
var cardAmount;

// Route for creating a new token (only for development)

router.post("/token", (req, res) => {
  const newToken = new Token({
    hash: req.body.hash,
    owner: req.body.owner,
  });

  newToken
    .save()
    .then((token) => res.json(token))
    .catch((err) => console.log(err));
});

router.get("/token", (request, response) => {
  Token.findOne({ owner: request.query.owner })
    .then((tokens) => response.json(tokens))
    .catch((err) => console.log(err));
});

router.get("/token-transfer-status", async (request, response) => {
  try {
    response.json(
      await Token.aggregate([
        {
          $lookup: {
            from: "users",
            localField: "owner",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $unwind: "$user",
        },
        {
          $match: {
            transferredStatus: { $eq: 'withTransferRequested' },
          }
        },
        // {
        //   $group: {
        //     _id: "$_id",
        //     transferredStatus: "$transferredStatus",
        //     walletAddress: "$walletAddress",
        //     hash: "$hash",
        //     name: "$user.name",
        //   },
        // },
        {
          $project: {
            _id: 1,
            hash: 1,
            transferredStatus: 1,
            walletAddress: 1,
            "user.name": 1,
          },
        },
      ]).exec()
    ); //await Token.find({ 'transferredStatus': 'withTransferRequested' }))
  } catch (error) {
    console.log(error);
    response.json([]);
  }
});

router.put("/token-transfer-request", (request, response) => {
  Token.findOneAndUpdate(
    { hash: request.query.hash },
    {
      $set: {
        transferredStatus: "withTransferRequested",
        walletAddress: request.query.walletAddress,
      },
    }
  )
    .then((tokens) => response.json(tokens))
    .catch((err) => console.log(err));
});

router.put("/token-transfer-done", ( request, response ) => {
  Token.findOneAndUpdate(
    { hash: request.query.hash },
    {
      $set: {
        transferredStatus: "withTransferDone",
      },
    }
  )
    .then((tokens) => response.json(tokens))
    .catch((err) => console.log(err));
})
// @route POST api/users/register
// @desc Register user
// @access Public

router.post("/stripe", async (req, res) => {
  //user sends price along with request
  const userPrice = parseInt(req.body.price) * 100;
  // const userPrice = parseFloat(req.body.price).toFixed(2);

  //create a payment intent
  const intent = await stripe.paymentIntents.create({
    //use the specified price
    amount: userPrice,
    currency: "USD",
  });

  //respond with the client secret and id of the new paymentintent
  cardAmount = req.body.price;
  userID = req.body.doctor;
  res.json({ client_secret: intent.client_secret, intent_id: intent.id });
});

router.post("/confirm-payment", async (req, res) => {
  //extract payment type from the client request
  const paymentType = String(req.body.payment_type);

  //handle confirmed stripe transaction
  if (paymentType == "stripe") {
    //get payment id for stripe
    const clientid = String(req.body.payment_id);

    //get the transaction based on the provided id
    stripe.paymentIntents.retrieve(clientid, function (err, paymentIntent) {
      //handle errors
      if (err) {
        console.log(err);
      }

      //respond to the client that the server confirmed the transaction
      if (paymentIntent.status === "succeeded") {
        if (cardAmount == 25) {
          User.findByIdAndUpdate(
            userID,
            { $inc: { membership1: 1 } },
            (err, data) => {
              if (err) {
              } else {
                res.json({ success: true });
              }
            }
          );
        }
        if (cardAmount == 40) {
          User.findByIdAndUpdate(
            userID,
            { $inc: { membership2: 1 } },
            (err, data) => {
              if (err) {
              } else {
                res.json({ success: true });
              }
            }
          );
        }
        if (cardAmount == 10) {
          User.findByIdAndUpdate(
            userID,
            { $inc: { membership3: 1 } },
            (err, data) => {
              if (err) {
              } else {
                res.json({ success: true });
              }
            }
          );
        }
        // res.json({success: true})
      } else {
        res.json({ success: false });
      }
    });
  }
});

router.post("/register", (req, res) => {
  // Form validation
  const { errors, isValid } = validateRegisterInput(req.body);

  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findOne({ email: req.body.email }).then((user) => {
    if (user) {
      return res.status(400).json({ msg: "Email already exists" });
    } else {
      const newUser = new User({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        idNumber: req.body.idNumber,
        address: req.body.address,
        spouseid: req.body.spouseid,
        spousename: req.body.spousename,
      });

      // Hash password before saving in database
      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          if (err) throw err;
          newUser.password = hash;
          newUser
            .save()
            .then((user) => res.json(user))
            .catch((err) => console.log(err));
        });
      });
    }
  });
});

// @route POST api/users/login
// @desc Login user and return JWT token
// @access Public
router.post("/login", (req, res) => {
  // Form validation
  const { errors, isValid } = validateLoginInput(req.body);

  // Check validation
  if (!isValid) {
    return res.status(400).json(errors);
  }

  const email = req.body.email;
  const password = req.body.password;

  // Find user by email
  User.findOne({ email }).then((user) => {
    // Check if user exists
    if (!user) {
      return res.status(404).json({ message: "Email not found" });
    }

    // Check password
    bcrypt.compare(password, user.password).then((isMatch) => {
      if (isMatch) {
        // User matched
        // Create JWT Payload
        const payload = {
          id: user.id,
          name: user.name,
          email: user.email,
        };

        // Sign token
        jwt.sign(
          payload,
          keys.secretOrKey,
          {
            expiresIn: 31556926, // 1 year in seconds
          },
          (err, token) => {
            res.json({
              success: true,
              token: "Bearer " + token,
            });
          }
        );
      } else {
        return res.status(400).json({ message: "Password incorrect" });
      }
    });
  });
});

router.post("/get-all-doctors", (req, res) => {
  User.find((error, data) => {
    if (error) {
      return next(error);
    } else {
      res.json(data);
    }
  });
});

router.post("/delete-user", (req, res) => {
  User.findByIdAndDelete(req.body.id, (error, data) => {
    if (error) {
      console.log(error);
    } else {
      res.json(data);
    }
  });
});

router.post("/get-one-user", (req, res) => {
  User.findById(req.body.id, (error, data) => {
    if (error) {
      console.log(error);
    } else {
      res.json(data);
    }
  });
});

router.get("/buy-with-paypal", (req, res) => {
  var payReq = JSON.stringify({
    intent: "sale",
    redirect_urls: {
      // 'return_url': 'https://cima.roi4u.live/api/users/process',
      // 'cancel_url': 'https://cima.roi4u.live/api/users/cancel',
      return_url: "http://localhost:5000/api/users/process",
      cancel_url: "http://localhost:5000/api/users/cancel",
    },
    payer: {
      payment_method: "paypal",
    },
    transactions: [
      {
        amount: {
          total: process.env.PAYPAL_AMOUNT,
          currency: "USD",
        },
        description: "This is the payment transaction description.",
      },
    ],
  });

  paypal.payment.create(payReq, function (error, payment) {
    if (error) {
      console.error(error);
    } else {
      //capture HATEOAS links
      var links = {};
      payment.links.forEach(function (linkObj) {
        links[linkObj.rel] = {
          href: linkObj.href,
          method: linkObj.method,
        };
      });

      //if redirect url present, redirect user
      if (links.hasOwnProperty("approval_url")) {
        userID = req.query.user;
        userAmount = process.env.PAYPAL_AMOUNT;
        res.send(links["approval_url"].href);
      } else {
        console.error("no redirect URI present");
      }
    }
  });
});

router.get("/process", function (req, res) {
  var paymentId = req.query.paymentId;
  var payerId = { payer_id: req.query.PayerID };
  paypal.payment.execute(paymentId, payerId, function (error, payment) {
    if (error) {
      console.error(error);
    } else {
      if (payment.state == "approved") {
        try {
          var timeNow = new Date();
          User.findOne({ _id: userID }).then(async (user) => {
            if (!user) {
              console.log("User Not found");
            } else {
              var tx;
              try {
                console.log("User found");
                tx = await signedTicketNFTContract.create(
                  process.env.PUBLIC_KEY,
                  { gasLimit: "1000000", gasPrice: "200000000000" }
                );
              } catch (error) {
                //agrgegar manejo de errores
                tx = null;
              }

              if (tx != null) {
                await tx.wait();
                var nftId = await signedTicketNFTContract.totalSupply();
                User.findByIdAndUpdate(
                  userID,
                  { $push: { ticket: timeNow, hash: tx.hash, nftId: nftId } },
                  async (err, data) => {
                    res.sendFile(__dirname + "/paypal.html");
                  }
                );
              } else {
                res.sendFile(__dirname + "/error.html");
              }
            }
          });
        } catch (error) {
          console.error(error);
        }
      } else {
        res.send("payment not successful");
      }
    }
  });
});

module.exports = router;
