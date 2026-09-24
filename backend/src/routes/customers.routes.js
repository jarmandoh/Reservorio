'use strict';

const express = require('express');
const { customerValidators } = require('../validators/customer.validators');
const { requireCustomer } = require('../middleware/auth');
const {
  listCustomers,
  createCustomer,
  findCustomerByEmail,
  getCustomerHistory,
  getCustomerProfile,
  exportCustomerData,
  deleteCustomer,
} = require('../controllers/customers.controller');

const router = express.Router();

router.get('/', listCustomers);
router.post('/', customerValidators.create, createCustomer);
router.get('/email/:email', findCustomerByEmail);
router.get('/me', requireCustomer, getCustomerProfile);
router.get('/:id/history', requireCustomer, getCustomerHistory);
router.get('/:id/export', requireCustomer, exportCustomerData);
router.delete('/:id', requireCustomer, deleteCustomer);

module.exports = router;
