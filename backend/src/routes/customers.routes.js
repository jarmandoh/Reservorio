'use strict';

const express = require('express');
const { customerValidators } = require('../validators/customer.validators');
const { listCustomers, createCustomer } = require('../controllers/customers.controller');

const router = express.Router();

router.get('/', listCustomers);
router.post('/', customerValidators.create, createCustomer);

module.exports = router;
