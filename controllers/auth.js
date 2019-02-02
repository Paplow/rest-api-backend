const { validationResult } = require('express-validator/check');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/user');
const Err = require('../util/error-handler');

exports.signup = (req, res, next) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		return Err.throwError('Validation failed!', 422, errors.array());
	}

	const inputs = req.body;
	bcrypt
		.hash(inputs.password, 12)
		.then(hashPassword => {
			const user = new User({
				name: inputs.name,
				email: inputs.email,
				password: hashPassword,
				posts: []
			});
			return user.save();
		})
		.then(user => {
			res.status(201).json({ message: 'User created', userId: user._id });
		})
		.catch(err => Err.catchError(err, next));
};

exports.login = (req, res, next) => {
	const email = req.body.email;
	const password = req.body.password;
	let loadedUser;

	User.findOne({ email: email })
		.then(user => {
			if (!user) {
				return Err.throwError('User not found', 401);
			}
			loadedUser = user;
			return bcrypt.compare(password, user.password);
		})
		.then(isEqual => {
			if (!isEqual) {
				return Err.throwError('Wrong password!', 401);
			}
			const token = jwt.sign(
				{
					email: loadedUser.email,
					userId: loadedUser._id.toString()
				},
				'secret',
				{
					expiresIn: '1h'
				}
			);

			res.status(200).json({ token: token, userId: loadedUser._id.toString() });
		})
		.catch(err => Err.catchError(err, next));
};