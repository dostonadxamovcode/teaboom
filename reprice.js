(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.Reprice = api;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function calculateResult(product) {
    var oldPrice = product.myPrice;
    var inStock = (product.competitors || []).filter(function (competitor) {
      return competitor.inStock === true;
    });

    if (inStock.length === 0) {
      return { sku: product.sku, oldPrice: oldPrice, newPrice: product.maxPrice, reason: 'NO_COMPETITORS' };
    }

    var lowest = inStock.reduce(function (min, competitor) {
      return competitor.price < min ? competitor.price : min;
    }, inStock[0].price);

    var candidate = Math.floor(lowest - product.step);

    if (candidate < product.minPrice) {
      return { sku: product.sku, oldPrice: oldPrice, newPrice: product.minPrice, reason: 'AT_MIN' };
    }
    if (candidate > product.maxPrice) {
      return { sku: product.sku, oldPrice: oldPrice, newPrice: product.maxPrice, reason: 'AT_MAX' };
    }
    return { sku: product.sku, oldPrice: oldPrice, newPrice: candidate, reason: 'UNDERCUT' };
  }

  function calculateReprice(products) {
    return products.map(calculateResult);
  }

  return { calculateResult: calculateResult, calculateReprice: calculateReprice };
});
