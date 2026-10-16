const variants = {
  100:  { sku: '01306', price: 326.40, oldPrice: 349.20 },
  500:  { sku: '01307', price: 1432, oldPrice: 1646 },
  1000: { sku: '01308', price: 2064, oldPrice: 2592 },
  5000: { sku: '01309', price: 6320, oldPrice: 8710 }
};
const sizeButtons = [...document.querySelectorAll('.size-option')];
const sku = document.querySelector('#product-sku');
const currentPrice = document.querySelector('#current-price');
const oldPrice = document.querySelector('#old-price');
const discount = document.querySelector('#discount');
const cartButton = document.querySelector('#cart-button');
const cartFeedback = document.querySelector('#cart-feedback');
let selectedSize = 100;

function formatPrice(value) {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value) + ' ₽';
}

function selectVariant(size) {
  const variant = variants[size];
  if (!variant) return;
  selectedSize = Number(size);
  sizeButtons.forEach((button) => {
    const selected = Number(button.dataset.size) === selectedSize;
    button.classList.toggle('is-selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  sku.textContent = variant.sku;
  currentPrice.textContent = formatPrice(variant.price);
  oldPrice.textContent = formatPrice(variant.oldPrice);
  discount.textContent = '−' + Math.round((1 - variant.price / variant.oldPrice) * 100) + '%';
  cartFeedback.textContent = '';
  cartButton.querySelector('span').textContent = 'В корзину';
}

sizeButtons.forEach((button) => {
  button.addEventListener('click', () => selectVariant(button.dataset.size));
});

cartButton.addEventListener('click', () => {
  const weight = selectedSize >= 1000 ? (selectedSize / 1000) + ' кг' : selectedSize + ' г';
  cartFeedback.textContent = `Демо: выбрана фасовка ${weight}. Реальная корзина не подключена.`;
  cartButton.querySelector('span').textContent = 'Выбрано';
});
