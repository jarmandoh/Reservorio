'use strict';

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

function runWithRlsContext(context, next) {
  return storage.run(
    {
      role: String(context?.role || 'anon'),
      businessId: context?.businessId ? String(context.businessId) : '',
      ownerId: context?.ownerId ? String(context.ownerId) : '',
      customerId: context?.customerId ? String(context.customerId) : '',
    },
    next
  );
}

function getRlsContext() {
  return storage.getStore() || { role: 'anon', businessId: '', ownerId: '', customerId: '' };
}

module.exports = { runWithRlsContext, getRlsContext };
