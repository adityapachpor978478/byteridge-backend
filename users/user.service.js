const config = require('config.js');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('_helpers/db');
const User = db.User;

module.exports = {
    authenticate,
    getAll,
    getAudit,
    logout,
    getById,
    create,
    update,
    delete: _delete
};

async function authenticate({ username, password },ip) {
    const user = await User.findOneAndUpdate(
        { username },
        {$set:{"loginTime": Date.now(),"clientIp":ip}}, 
        {new: true}
        );
    if (user && bcrypt.compareSync(password, user.hash)) {
        const token = jwt.sign({ sub: user.id,role: user.role }, config.secret);
        const { hash, ...userWithoutHash } = user.toObject();
        return {
            ...userWithoutHash,
            token
        };
    }
}

async function logout(username,ip) {
    const user = await User.findOneAndUpdate(
        { username },
        {$set:{"logoutTime": Date.now(),"clientIp":ip}}, 
        {new: true}
        );
    const { hash, ...userWithoutHash } = user.toObject();
    return {
        ...userWithoutHash
    };
    
}

async function getAll() {
    return await User.find().select('-hash');
}

async function getAudit() {
    return await User.find().select('username loginTime logoutTime clientIp role');
}

async function getById(id) {
    return await User.findById(id).select('-hash');
}

async function create(userParam) {
    // validate
    if (await User.findOne({ username: userParam.username })) {
        throw 'Username "' + userParam.username + '" is already taken';
    }

    const user = new User(userParam);

    // hash password
    if (userParam.password) {
        user.hash = bcrypt.hashSync(userParam.password, 10);
    }

    // save user
    await user.save();
}

async function update(id, userParam) {
    const user = await User.findById(id);

    // validate
    if (!user) throw 'User not found';
    if (user.username !== userParam.username && await User.findOne({ username: userParam.username })) {
        throw 'Username "' + userParam.username + '" is already taken';
    }

    // hash password if it was entered
    if (userParam.password) {
        userParam.hash = bcrypt.hashSync(userParam.password, 10);
    }

    // copy userParam properties to user
    Object.assign(user, userParam);

    await user.save();
}

async function _delete(id) {
    await User.findByIdAndRemove(id);
}