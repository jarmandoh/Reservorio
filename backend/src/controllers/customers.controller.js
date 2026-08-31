'use strict';

const customersService = require('../services/customers.service');

async function listCustomers(req, res) {
  try {
    const result = await customersService.listCustomers();
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function createCustomer(req, res) {
  try {
    const result = await customersService.createCustomer(req.body);
    return res.status(result.status).json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

module.exports = { listCustomers, createCustomer };
