(() => {
  'use strict';

  const WHATSAPP = '27672364114';
  const CART_KEY = 'ambition-wear-cart';
  const FALLBACK_PRODUCTS = [
    {
      name: 'Ambition Bjeweled Beanies',
      category: 'Headwear',
      description: 'A statement beanie with the edge of the Ambition brand.',
      sizes: ['One size'],
      colours: ['Black', 'White'],
      price: '120',
      priceLabel: 'R120',
      image: 'https://raw.githubusercontent.com/recordingsabantu/Ambition.co/main/Ambition%20Wear/Ambition%20Bjeweled%20Beanies/Screenshot_20261111_133815_WhatsApp.jpg',
      gallery: [
        'https://raw.githubusercontent.com/recordingsabantu/Ambition.co/main/Ambition%20Wear/Ambition%20Bjeweled%20Beanies/Screenshot_20261111_133815_WhatsApp.jpg',
        'https://raw.githubusercontent.com/recordingsabantu/Ambition.co/main/Ambition%20Wear/Ambition%20Bjeweled%20Beanies/Screenshot_20261111_133821_WhatsApp.jpg',
        'https://raw.githubusercontent.com/recordingsabantu/Ambition.co/main/Ambition%20Wear/Ambition%20Bjeweled%20Beanies/Screenshot_20261111_133826_WhatsApp.jpg'
      ],
      status: 'In stock',
      orderable: true
    },
    {
      name: 'Ambition Relaxed Hoodie',
      category: 'Hoodies',
      description: 'Relaxed-fit Ambition hoodie.',
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colours: ['As pictured'],
      price: '380',
      priceLabel: 'R380',
      image: 'https://raw.githubusercontent.com/recordingsabantu/Ambition.co/main/Ambition%20Wear/Ambition%20Relaxed%20Hoodie%20R380/Ambition%20Relaxed%20Hoodie%20R380.jpeg',
      gallery: ['https://raw.githubusercontent.com/recordingsabantu/Ambition.co/main/Ambition%20Wear/Ambition%20Relaxed%20Hoodie%20R380/Ambition%20Relaxed%20Hoodie%20R380.jpeg'],
      status: 'In stock',
      orderable: true
    },
    {
      name: 'Ambition Oversized T-shirt',
      category: 'T-shirts',
      description: 'Everyday oversized Ambition fit.',
      sizes: ['S', 'M', 'L', 'XL', 'XXL'],
      colours: ['Black', 'White'],
      price: '250',
      priceLabel: 'R250',
      image: 'https://raw.githubusercontent.com/recordingsabantu/Ambition.co/main/Ambition%20Wear/Ambition%20Oversized%20T-shirt/Ambition%20Oversized%20T-shirt%20-R250.jpeg',
      gallery: ['https://raw.githubusercontent.com/recordingsabantu/Ambition.co/main/Ambition%20Wear/Ambition%20Oversized%20T-shirt/Ambition%20Oversized%20T-shirt%20-R250.jpeg'],
      status: 'In stock',
      orderable: true
    }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const money = (value) => `R${Number(value || 0).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;

  function normalizeImageUrl(value) {
    if (!value) return '';
    const candidate = String(value).trim();
    if (!candidate) return '';
    if (/^https?:\/\//i.test(candidate) || /^data:/i.test(candidate)) return candidate;
    try {
      return new URL(candidate, window.location.href).toString();
    } catch (_) {
      return candidate;
    }
  }

  function normalizeProduct(item) {
    if (!item || typeof item !== 'object' || !item.name) return null;
    const gallery = Array.isArray(item.gallery)
      ? item.gallery.filter(Boolean).map(normalizeImageUrl)
      : [];
    const primaryImage = normalizeImageUrl(item.image || gallery[0] || '');
    const priceValue = Number(item.price);
    return {
      ...item,
      name: String(item.name),
      category: item.category || 'Collection',
      description: item.description || 'Premium Ambition essentials.',
      sizes: Array.isArray(item.sizes) && item.sizes.length ? item.sizes : ['One size'],
      colours: Array.isArray(item.colours) ? item.colours : [],
      image: primaryImage,
      gallery: gallery.length ? gallery : primaryImage ? [primaryImage] : [],
      price: Number.isFinite(priceValue) ? String(priceValue) : '',
      priceLabel: item.priceLabel || (Number.isFinite(priceValue) ? `R${priceValue}` : 'Ask for price'),
      status: item.status || 'In stock',
      orderable: item.orderable !== false
    };
  }

  function resolveCatalogUrl() {
    try {
      return new URL('stock.json', window.location.href);
    } catch (_) {
      return new URL('stock.json', document.baseURI || 'https://example.com/');
    }
  }

  let products = [];
  let cart = [];
  let activeCategory = 'All';
  try {
    const stored = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    if (Array.isArray(stored)) cart = stored.filter((item) => item && Number(item.quantity) > 0);
  } catch (_) { cart = []; }

  function prepareProducts(items) {
    const catalog = (Array.isArray(items) ? items : [])
      .map(normalizeProduct)
      .filter(Boolean)
      .filter((item) => item.name !== 'Ambition Cap');

    if (!catalog.some((item) => /bjeweled/i.test(item.name))) {
      FALLBACK_PRODUCTS.forEach((fallback) => {
        const normalized = normalizeProduct(fallback);
        if (normalized) catalog.push(normalized);
      });
    }

    return catalog;
  }

  function galleryFor(item) {
    const images = Array.isArray(item.gallery) ? item.gallery.filter(Boolean).map(normalizeImageUrl) : [];
    if (!images.length && item.image) images.push(normalizeImageUrl(item.image));
    return images;
  }

  function drawFilters() {
    const wrapper = $('#product-filters, .catalog-filters');
    if (!wrapper) return;
    const categories = ['All', ...new Set(products.map((item) => item.category).filter(Boolean))];
    wrapper.innerHTML = categories.map((category) =>
      `<button type="button" class="filter-pill ${category === activeCategory ? 'is-active' : ''}" data-filter="${esc(category)}" aria-pressed="${category === activeCategory}">${esc(category)}</button>`
    ).join('');
  }

  function visibleProducts() {
    return activeCategory === 'All' ? products : products.filter((item) => item.category === activeCategory);
  }

  function productCard(item, index) {
    const gallery = galleryFor(item);
    const price = Number(item.price) > 0 ? money(item.price) : (item.priceLabel || 'Ask for price');
    const images = gallery.length ? gallery : [''];
    return `<article class="product-card interactive-product" data-product-index="${index}" tabindex="0" role="button" aria-label="View ${esc(item.name)} details">
      <div class="product-card__visual">
        <div class="product-card__slides">${images.map((src, i) => `<img src="${esc(src)}" alt="${esc(item.name)}${images.length > 1 ? ` view ${i + 1}` : ''}" class="product-card__slide ${i === 0 ? 'is-visible' : ''}"></div>`).join('')}
        <span class="product-card__badge">10 available items</span>
        ${images.length > 1 ? `<button type="button" class="product-slide-next" aria-label="Show next ${esc(item.name)} image">›</button><span class="product-slide-count">1 / ${images.length}</span>` : ''}
      </div>
      <div class="product-card__meta"><div><p class="product-card__category">${esc(item.category || 'Collection')}</p><h3>${esc(item.name)}</h3></div><span class="product-card__price">${esc(price)}</span></div>
      <div class="product-card__info"><p>${esc(item.description || 'Premium Ambition essentials.')}</p><div class="product-card__footer"><span class="stock-pill">${esc(item.status || 'In stock')}</span><button type="button" class="mini-btn" data-open-bag>Bag</button></div></div>
    </article>`;
  }

  function render() {
    const grid = $('#shop-products, #shop-grid');
    if (grid) {
      const list = visibleProducts();
      grid.innerHTML = list.length ? list.map((item, index) => productCard(item, index)).join('') : '<p class="loading">No items in this collection yet.</p>';
      setupSlideshows(grid);
    }
    const featured = $('#featured-products');
    if (featured) featured.innerHTML = products.slice(0, 4).map((item, index) => productCard(item, index)).join('');
  }

  function setupSlideshows(root = document) {
    root.querySelectorAll('.product-card').forEach((card) => {
      if (card.dataset.slideshowReady) return;
      card.dataset.slideshowReady = 'true';
      const slides = [...card.querySelectorAll('.product-card__slide')];
      if (slides.length < 2) return;
      let current = 0;
      const show = (next) => {
        current = (next + slides.length) % slides.length;
        slides.forEach((slide, i) => slide.classList.toggle('is-visible', i === current));
        const count = card.querySelector('.product-slide-count');
        if (count) count.textContent = `${current + 1} / ${slides.length}`;
      };
      card.querySelector('.product-slide-next')?.addEventListener('click', (event) => {
        event.stopPropagation();
        show(current + 1);
      });
      const timer = window.setInterval(() => {
        if (!document.body.contains(card)) return window.clearInterval(timer);
        if (!card.matches(':hover') && !card.contains(document.activeElement)) show(current + 1);
      }, 2800);
    });
  }

  function openProduct(item) {
    $('.product-modal-root')?.remove();
    const images = galleryFor(item);
    const sizes = Array.isArray(item.sizes) && item.sizes.length ? item.sizes : ['One size'];
    const root = document.createElement('div');
    root.className = 'product-modal-root';
    root.innerHTML = `<div class="modal-backdrop" data-dismiss-product>
      <section class="product-modal" role="dialog" aria-modal="true" aria-label="${esc(item.name)} details">
        <button class="modal-close" type="button" data-dismiss-product aria-label="Close">×</button>
        <div class="product-modal__gallery">
          <div class="product-modal__main">${images.map((src, i) => `<img src="${esc(src)}" alt="${esc(item.name)} view ${i + 1}" class="product-modal__photo ${i === 0 ? 'is-visible' : ''}"></div>`).join('')}
          <div class="product-modal__thumbs">${images.map((src, i) => `<button type="button" class="product-modal__thumb ${i === 0 ? 'is-active' : ''}" data-thumb-index="${i}" aria-label="Show image ${i + 1}"><img src="${esc(src)}" alt="${esc(item.name)} thumbnail ${i + 1}"></button>`).join('')}</div>
        </div>
        <div class="product-modal__details"><p class="eyebrow">${esc(item.category || 'AMBITION')}</p><h2>${esc(item.name)}</h2>
          <div class="product-modal__price-row"><strong>${esc(Number(item.price) > 0 ? money(item.price) : item.priceLabel || 'Ask for price')}</strong><span>${esc(item.status || 'In stock')}</span></div>
          <p class="product-modal__desc">${esc(item.description || 'Premium style built to move with you.')}</p>
          ${item.colours?.length ? `<p class="product-colours"><b>Colour:</b> ${item.colours.map(esc).join(' / ')}</p>` : ''}
          <div class="variant-block"><div class="variant-label-row"><span>Select size</span><span class="meta-note">10 available items</span></div><div class="size-options">${sizes.map((size, i) => `<button type="button" class="size-chip ${i === 0 ? 'is-selected' : ''}" data-size="${esc(size)}" aria-pressed="${i === 0}">${esc(size)}</button>`).join('')}</div></div>
          <div class="variant-block"><div class="variant-label-row"><span>Quantity</span></div><div class="qty-picker"><button type="button" data-qty="-1" aria-label="Decrease quantity">−</button><input class="product-quantity" type="number" min="1" max="10" value="1" inputmode="numeric"><button type="button" data-qty="1" aria-label="Increase quantity">+</button></div></div>
          <button type="button" class="primary-action" data-add-to-bag>Add to bag</button>
        </div>
      </section></div>`;
    document.body.appendChild(root);
    const modal = root.querySelector('.product-modal');
    root.addEventListener('click', (event) => {
      if (event.target.closest('[data-dismiss-product]')) { root.remove(); return; }
      const thumb = event.target.closest('[data-thumb-index]');
      if (thumb) {
        const index = Number(thumb.dataset.thumbIndex);
        modal.querySelectorAll('.product-modal__photo').forEach((image, i) => image.classList.toggle('is-visible', i === index));
        modal.querySelectorAll('.product-modal__thumb').forEach((button, i) => button.classList.toggle('is-active', i === index));
        return;
      }
      const size = event.target.closest('[data-size]');
      if (size) {
        modal.querySelectorAll('[data-size]').forEach((button) => {
          const selected = button === size;
          button.classList.toggle('is-selected', selected);
          button.setAttribute('aria-pressed', String(selected));
        });
        return;
      }
      const qtyButton = event.target.closest('[data-qty]');
      if (qtyButton) {
        const input = modal.querySelector('.product-quantity');
        input.value = Math.max(1, Math.min(10, Number(input.value || 1) + Number(qtyButton.dataset.qty)));
        return;
      }
      if (event.target.closest('[data-add-to-bag]')) {
        const sizeValue = modal.querySelector('.size-chip.is-selected')?.dataset.size || 'One size';
        const quantity = Math.max(1, Math.min(10, Number(modal.querySelector('.product-quantity').value || 1)));
        const matching = cart.find((entry) => entry.name === item.name && entry.size === sizeValue);
        if (matching) matching.quantity += quantity;
        else cart.push({ name: item.name, image: images[0] || item.image || '', size: sizeValue, quantity, price: Number(item.price) || 0 });
        saveCart();
        root.remove();
        openBag();
      }
    });
  }

  function injectBag() {
    if ($('#bag-drawer')) return;
    document.body.insertAdjacentHTML('beforeend', `<div class="drawer-backdrop"></div><aside class="bag-drawer" id="bag-drawer" role="dialog" aria-modal="true" aria-label="Shopping bag" aria-hidden="true">
      <div class="bag-drawer__header"><div><p class="eyebrow">Your bag</p><h3>Selected pieces</h3></div><button class="drawer-close" type="button" aria-label="Close bag">×</button></div>
      <div class="bag-drawer__body"><div class="cart-items"></div><section class="checkout-panel" aria-label="Invoice options">
        <h4>Before we invoice you</h4>
        <fieldset class="checkout-block"><legend class="checkout-label">Payment option</legend>
          <label class="radio-option"><input type="radio" name="payment-method" value="EFT" checked> EFT / bank transfer</label>
          <label class="radio-option"><input type="radio" name="payment-method" value="Card"> Card (payment link)</label>
          <label class="radio-option"><input type="radio" name="payment-method" value="Cash"> Cash on collection</label>
          <label class="radio-option"><input type="radio" name="payment-method" value="Payfast"> PayFast (payment link)</label>
        </fieldset>
        <fieldset class="checkout-block"><legend class="checkout-label">Delivery option</legend>
          <label class="radio-option"><input type="radio" name="delivery-method" value="Local delivery" checked> Local delivery (confirm fee)</label>
          <label class="radio-option"><input type="radio" name="delivery-method" value="Courier"> Courier (confirm fee)</label>
          <label class="radio-option"><input type="radio" name="delivery-method" value="Collection"> Collection</label>
        </fieldset>
        <div class="checkout-form"><label>Client name<input id="checkout-name" type="text" autocomplete="name" placeholder="Client name" required></label><label>Email<input id="checkout-email" type="email" autocomplete="email" placeholder="you@example.com" required></label><label>Delivery address<input id="checkout-address" type="text" autocomplete="street-address" placeholder="Your address (if needed)"></label></div>
        <div class="summary-row"><span>Subtotal</span><strong class="bag-subtotal">R0</strong></div><p class="delivery-note">Delivery fee and final total will be confirmed on your invoice.</p>
        <button type="button" class="primary-action" id="send-invoice">Request invoice on WhatsApp</button>
      </section></div></aside>`);
    $('.drawer-backdrop').addEventListener('click', closeBag);
    $('#bag-drawer .drawer-close').addEventListener('click', closeBag);
    $('#send-invoice').addEventListener('click', sendInvoice);
  }

  function drawCart() {
    const target = $('.cart-items');
    if (target) target.innerHTML = cart.length ? cart.map((item, index) => `<article class="cart-item"><img src="${esc(item.image)}" alt="${esc(item.name)}"><div class="cart-item__info"><div class="cart-item__top"><h4>${esc(item.name)}</h4><button type="button" class="remove-item" data-remove="${index}" aria-label="Remove ${esc(item.name)}">Remove</button></div><p>${esc(item.size || 'One size')} · Qty ${esc(item.quantity)}</p><strong>${esc(Number(item.price) ? money(Number(item.price) * Number(item.quantity)) : 'Price to confirm')}</strong></div></article>`).join('') : '<p class="empty-state">Your bag is empty.</p>';
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    const subtotalEl = $('.bag-subtotal');
    if (subtotalEl) subtotalEl.textContent = money(subtotal);
    document.querySelectorAll('.bag-count').forEach((el) => { el.textContent = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0); });
  }

  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (_) { /* storage may be unavailable */ }
    drawCart();
  }

  function openBag() {
    injectBag();
    $('.bag-drawer')?.classList.add('is-open');
    $('.drawer-backdrop')?.classList.add('is-open');
    $('.bag-drawer')?.setAttribute('aria-hidden', 'false');
    document.body.classList.add('drawer-open');
    drawCart();
  }

  function closeBag() {
    $('.bag-drawer')?.classList.remove('is-open');
    $('.drawer-backdrop')?.classList.remove('is-open');
    $('.bag-drawer')?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('drawer-open');
  }

  function toast(message) {
    const element = $('.toast');
    if (!element) return;
    element.textContent = message;
    element.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove('show'), 2600);
  }

  function sendInvoice() {
    if (!cart.length) return toast('Your bag is empty');
    const name = $('#checkout-name')?.value.trim();
    const email = $('#checkout-email')?.value.trim();
    const address = $('#checkout-address')?.value.trim();
    const delivery = $('input[name="delivery-method"]:checked')?.value || 'Local delivery';
    const payment = $('input[name="payment-method"]:checked')?.value || 'EFT';
    if (!name || !email || !$('#checkout-email').checkValidity()) return toast('Please enter your client name and a valid email');
    if (delivery !== 'Collection' && !address) return toast('Please add your delivery address');
    const items = cart.map((item) => `${item.name} (${item.size || 'One size'}) x ${item.quantity} — ${Number(item.price) ? money(item.price * item.quantity) : 'price to confirm'}`).join('\n');
    const total = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    const message = [
      'Hello Ambition Wear, please send me an invoice for this order:', '', items, '',
      `Client name: ${name}`, `Email: ${email}`, `Payment option: ${payment}`, `Delivery option: ${delivery}`,
      ...(address ? [`Delivery address: ${address}`] : []),
      `Subtotal: ${money(total)}`, 'Please confirm delivery fee and final total on the invoice.'
    ].join('\n');
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  document.addEventListener('click', (event) => {
    const filter = event.target.closest('[data-filter]');
    if (filter) {
      activeCategory = filter.dataset.filter;
      drawFilters();
      render();
      return;
    }

    if (event.target.closest('[data-open-bag]')) {
      openBag();
      return;
    }

    const remove = event.target.closest('[data-remove]');
    if (remove) {
      cart.splice(Number(remove.dataset.remove), 1);
      saveCart();
      return;
    }

    const card = event.target.closest('.product-card[data-product-index]');
    if (card && !event.target.closest('.product-slide-next, [data-open-bag], .mini-btn')) {
      const item = visibleProducts()[Number(card.dataset.productIndex)];
      if (item) openProduct(item);
      return;
    }

    if (event.target.closest('.bag-open, .bag-count')) openBag();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeBag();
      $('.product-modal-root')?.remove();
    }
    const card = event.target.closest?.('.product-card[data-product-index]');
    if (card && (event.key === 'Enter' || event.key === ' ') && !event.target.closest('button')) {
      event.preventDefault();
      const item = visibleProducts()[Number(card.dataset.productIndex)];
      if (item) openProduct(item);
    }
  });

  function init() {
    injectBag();
    drawCart();
    document.querySelectorAll('.year').forEach((element) => { element.textContent = new Date().getFullYear(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  fetch(resolveCatalogUrl())
    .then((response) => { if (!response.ok) throw new Error('Catalog unavailable'); return response.json(); })
    .then((items) => {
      if (!Array.isArray(items)) throw new Error('Invalid catalog');
      products = prepareProducts(items);
      drawFilters();
      render();
    })
    .catch(() => {
      products = prepareProducts(FALLBACK_PRODUCTS);
      const grid = $('#shop-products, #shop-grid');
      if (grid) {
        drawFilters();
        render();
      } else {
        console.warn('Ambition catalog failed to load and fallback products were used.');
      }
    });
})();
