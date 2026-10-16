(function () {
  'use strict';

  var statusElement = document.getElementById('results-status');
  var bodyElement = document.getElementById('results-body');

  function formatPrice(value) {
    return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value);
  }

  function createCell(label, text, className) {
    var cell = document.createElement('td');
    cell.setAttribute('data-label', label);
    cell.textContent = text;
    if (className) {
      cell.className = className;
    }
    return cell;
  }

  function render(products, results) {
    var fragment = document.createDocumentFragment();

    results.forEach(function (result, index) {
      var row = document.createElement('tr');
      var product = products[index];

      row.appendChild(createCell('SKU', result.sku, 'sku'));
      row.appendChild(createCell('Product', product ? product.name : ''));
      row.appendChild(createCell('Old price', formatPrice(result.oldPrice), 'old-price'));
      row.appendChild(createCell('New price', formatPrice(result.newPrice), 'new-price'));

      var reasonCell = createCell('Reason', '', '');
      var badge = document.createElement('span');
      badge.className = 'reason-badge';
      badge.textContent = result.reason;
      reasonCell.appendChild(badge);
      row.appendChild(reasonCell);

      fragment.appendChild(row);
    });

    bodyElement.appendChild(fragment);
    statusElement.textContent = results.length + ' product(s) recalculated.';
  }

  fetch('data/products.json')
    .then(function (response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      return response.json();
    })
    .then(function (products) {
      var results = Reprice.calculateReprice(products);
      render(products, results);
    })
    .catch(function (error) {
      statusElement.textContent =
        'Could not load data/products.json (' + error.message + '). ' +
        'Serve this page over HTTP, e.g. "python3 -m http.server 8000" (see README).';
      statusElement.classList.add('is-error');
    });
})();
