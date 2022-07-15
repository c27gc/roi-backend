const mongoose = require("mongoose");
const Schema = mongoose.Schema;

// Create Schema
const TokenSchema = new Schema({
    hash: {
        type: String,
        required: true
    },
    transferredStatus: {
        type: String,
        default: "notTransferred",
        required: true
    },
    walletAddress: {
        type: String,
        required: false,
        default: ""
    },
    owner: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: "user"
    }
});

module.exports = Token = mongoose.model("token", TokenSchema);