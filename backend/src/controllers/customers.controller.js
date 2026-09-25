'use strict';

const customersService = require('../services/customers.service');

async function listCustomers(req, res) {
  try {
    const result = await customersService.listCustomers(req.query);
    const body = { ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) };
    if (result.meta) body.meta = result.meta;
    return res.status(result.status).json(body);
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function createCustomer(req, res) {
  try {
    const result = await customersService.createCustomer(req.body);
    return res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function findCustomerByEmail(req, res) {
  try {
    const result = await customersService.findCustomerByEmail(req.params.email);
    return res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function getCustomerHistory(req, res) {
  try {
    if (String(req.customerId) !== String(req.params.id)) {
      return res.status(403).json({ ok: false, message: 'Sin acceso a este historial' });
    }
    const result = await customersService.getCustomerHistory(req.params.id, req.query);
    const body = { ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) };
    if (result.meta) body.meta = result.meta;
    return res.status(result.status).json(body);
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function getCustomerProfile(req, res) {
  try {
    const result = await customersService.getCustomerProfile(req.customerId);
    return res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function exportCustomerData(req, res) {
  try {
    if (String(req.customerId) !== String(req.params.id)) {
      return res.status(403).json({ ok: false, message: 'Sin acceso a estos datos' });
    }
    const result = await customersService.exportCustomerData(req.params.id);
    return res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

async function deleteCustomer(req, res) {
  try {
    if (String(req.customerId) !== String(req.params.id)) {
      return res.status(403).json({ ok: false, message: 'Sin acceso a estos datos' });
    }
    const result = await customersService.deleteCustomer(req.params.id);
    return res
      .status(result.status)
      .json({ ok: result.ok, ...(result.ok ? { data: result.data } : { message: result.message }) });
  } catch (error) {
    return res.status(500).json({ ok: false, message: error.message });
  }
}

module.exports = {
  listCustomers,
  createCustomer,
  findCustomerByEmail,
  getCustomerHistory,
  getCustomerProfile,
  exportCustomerData,
  deleteCustomer,
};
