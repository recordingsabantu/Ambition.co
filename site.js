(() => {
  'use strict';

  const WHATSAPP = '27672364114';
  const CART_KEY = 'ambition-wear-cart';
  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const money = (value) => `R${Number(value || 0).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}`;

  function siteBaseUrl() {
    const url = new URL(document.baseURI || window.location.href);
    if (!url.pathname.endsWith('/') && !/\.[A-Za-z0-9]+$/.test(url.pathname)) url.pathname += '/';
    return url;
  }
  function assetUrl(value) {
    const candidate = String(value || '').trim();
    if (!candidate) return '';
    if (/^(https?:|data:)/i.test(candidate)) return candidate;
    return new URL(candidate, siteBaseUrl()).href;
  }
  function uniqueImages(item) {
    const seen = new Set();
    return (Array.isArray(item.gallery) ? item.gallery : []).concat(item.image || []).filter(Boolean).map(assetUrl).filter((url) => {
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });
  }

  let products = [];
  let cart = [];
  let activeCategory = 'All';
  try {
    const saved = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    if (Array.isArray(saved)) cart = saved.filter((item) => item && Number(item.quantity) > 0);
  } catch (_) { cart = []; }

  function normalizedProduct(item) {
    if (!item || typeof item !== 'object' || !item.name) return null;
    const gallery = uniqueImages(item);
    const priceValue = Number(item.price);
    return {
      ...item, name: String(item.name), category: item.category || 'Collection',
      description: item.description || 'Premium Ambition essentials.',
      sizes: Array.isArray(item.sizes) && item.sizes.length ? item.sizes : ['One size'],
      colours: Array.isArray(item.colours) ? item.colours : [], image: gallery[0] || '', gallery,
      price: Number.isFinite(priceValue) ? String(priceValue) : '',
      priceLabel: item.priceLabel || (Number.isFinite(priceValue) && priceValue > 0 ? money(priceValue) : 'Ask for price'),
      status: item.status || 'In stock', orderable: item.orderable !== false
    };
  }
  function fetchCatalog() {
    const primary = new URL('stock.json', siteBaseUrl());
    const fallback = new URL('https://raw.githubusercontent.com/recordingsabantu/Ambition.co/main/stock.json');
    return fetch(primary.href).then((response) => {
      if (!response.ok) throw new Error('Catalog unavailable');
      return response.json();
    }).catch(() => fetch(fallback.href).then((response) => {
      if (!response.ok) throw new Error('Catalog unavailable');
      return response.json();
    }));
  }
  function prepareProducts(items) {
    return (Array.isArray(items) ? items : []).map(normalizedProduct).filter(Boolean)
      .filter((item) => item.name !== 'Ambition Lifestyle');
  }
  const galleryFor = (item) => item.gallery?.length ? item.gallery : (item.image ? [item.image] : []);
  const visibleProducts = () => activeCategory === 'All' ? products : products.filter((item) => item.category === activeCategory);

  function drawFilters() {
    const wrapper = $('#product-filters, .catalog-filters');
    if (!wrapper) return;
    const categories = ['All', ...new Set(products.map((item) => item.category).filter(Boolean))];
    wrapper.innerHTML = categories.map((category) => `<button type="button" class="filter-pill ${category === activeCategory ? 'is-active' : ''}" data-filter="${esc(category)}" aria-pressed="${category === activeCategory}">${esc(category)}</button>`).join('');
  }
  function productCard(item, index) {
    const image = galleryFor(item)[0] || '';
    const price = Number(item.price) > 0 ? money(item.price) : item.priceLabel;
    const count = galleryFor(item).length;
    return `<article class="product-card interactive-product" data-product-index="${index}" tabindex="0" role="button" aria-label="View ${esc(item.name)} options">
      <div class="product-card__visual"><div class="product-card__slides"><img src="${esc(image)}" alt="${esc(item.name)}" class="product-card__slide is-visible" loading="lazy"></div><span class="product-card__badge">${count > 1 ? `${count} photos · View options` : 'View options'}</span></div>
      <div class="product-card__meta"><div><p class="product-card__category">${esc(item.category)}</p><h3>${esc(item.name)}</h3></div><span class="product-card__price">${esc(price)}</span></div>
      <div class="product-card__info"><p>${esc(item.description)}</p><div class="product-card__footer"><span class="stock-pill">${esc(item.status)}</span><span class="text-link">View item →</span></div></div></article>`;
  }
  function render() {
    const grid = $('#shop-products, #shop-grid');
    if (grid) {
      const list = visibleProducts();
      grid.innerHTML = list.length ? list.map(productCard).join('') : '<p class="loading">No items in this collection yet.</p>';
      grid.querySelectorAll('.product-card').forEach((card, index) => card.style.setProperty('--card-index', index));
    }
    const featured = $('#featured-products');
    if (featured) featured.innerHTML = products.slice(0, 4).map(productCard).join('');
  }

  function selectOption(root, selector, value, key) {
    root.querySelectorAll(selector).forEach((button) => {
      const selected = button.dataset[key] === value;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
  }
  function openProduct(item) {
    $('.product-modal-root')?.remove();
    const images = galleryFor(item);
    const imageList = images.length ? images : [''];
    const sizes = item.sizes.length ? item.sizes : ['One size'];
    const colours = item.colours || [];
    const root = document.createElement('div');
    root.className = 'product-modal-root';
    root.innerHTML = `<div class="modal-backdrop" data-dismiss-product><section class="product-modal" role="dialog" aria-modal="true" aria-label="${esc(item.name)} options">
      <button class="modal-close" type="button" data-dismiss-product aria-label="Close product details">×</button>
      <div class="product-modal__gallery"><div class="product-modal__main"><img data-main-photo class="product-modal__photo is-visible" src="${esc(imageList[0])}" alt="${esc(item.name)} photo 1"></div>
        <div class="product-modal__thumbs" aria-label="Choose a product photo">${imageList.map((src, index) => `<button type="button" class="product-modal__thumb ${index === 0 ? 'is-active' : ''}" data-thumb-index="${index}" aria-label="View photo ${index + 1} of ${imageList.length}"><img src="${esc(src)}" alt=""></button>`).join('')}</div>
        <p class="product-photo-count" aria-live="polite">${imageList.length} ${imageList.length === 1 ? 'photo' : 'photos'} · Select a photo to view</p></div>
      <div class="product-modal__details"><p class="eyebrow">${esc(item.category)}</p><h2>${esc(item.name)}</h2><div class="product-modal__price-row"><strong>${esc(Number(item.price) > 0 ? money(item.price) : item.priceLabel)}</strong><span>${esc(item.status)}</span></div><p class="product-modal__desc">${esc(item.description)}</p>
        ${colours.length ? `<div class="variant-block"><div class="variant-label-row"><span>Choose colour</span></div><div class="size-options">${colours.map((colour, i) => `<button type="button" class="size-chip ${i === 0 ? 'is-selected' : ''}" data-colour="${esc(colour)}" aria-pressed="${i === 0}">${esc(colour)}</button>`).join('')}</div></div>` : ''}
        <div class="variant-block"><div class="variant-label-row"><span>Choose size</span></div><div class="size-options">${sizes.map((size, i) => `<button type="button" class="size-chip ${i === 0 ? 'is-selected' : ''}" data-size="${esc(size)}" aria-pressed="${i === 0}">${esc(size)}</button>`).join('')}</div></div>
        <div class="variant-block"><div class="variant-label-row"><span>Quantity</span></div><div class="qty-picker"><button type="button" data-product-qty="-1" aria-label="Decrease quantity">−</button><input class="product-quantity" type="number" min="1" max="10" value="1"><button type="button" data-product-qty="1" aria-label="Increase quantity">+</button></div></div>
        <button type="button" class="primary-action" data-add-to-bag ${item.orderable ? '' : 'disabled'}>${item.orderable ? 'Add to bag' : 'Contact us to order'}</button></div></section></div>`;
    document.body.appendChild(root);
    const modal = $('.product-modal', root);
    root.addEventListener('click', (event) => {
      // Do not treat clicks inside the dialog (including photo thumbnails) as backdrop clicks.
      if (event.target.classList.contains('modal-backdrop') || event.target.closest('.modal-close')) { root.remove(); return; }
      const thumb = event.target.closest('[data-thumb-index]');
      if (thumb) {
        const index = Number(thumb.dataset.thumbIndex);
        const photo = $('[data-main-photo]', modal);
        photo.src = imageList[index];
        photo.alt = `${item.name} photo ${index + 1}`;
        modal.querySelectorAll('.product-modal__thumb').forEach((button, position) => button.classList.toggle('is-active', position === index));
        if (colours[index]) selectOption(modal, '[data-colour]', colours[index], 'colour');
        return;
      }
      const size = event.target.closest('[data-size]');
      if (size) { selectOption(modal, '[data-size]', size.dataset.size, 'size'); return; }
      const colour = event.target.closest('[data-colour]');
      if (colour) {
        selectOption(modal, '[data-colour]', colour.dataset.colour, 'colour');
        const index = colours.indexOf(colour.dataset.colour);
        if (imageList[index]) modal.querySelector(`[data-thumb-index="${index}"]`)?.click();
        return;
      }
      const quantityButton = event.target.closest('[data-product-qty]');
      if (quantityButton) {
        const input = $('.product-quantity', modal);
        input.value = Math.max(1, Math.min(10, Number(input.value || 1) + Number(quantityButton.dataset.productQty)));
        return;
      }
      if (event.target.closest('[data-add-to-bag]') && item.orderable) {
        const size = $('.size-chip[data-size].is-selected', modal)?.dataset.size || 'One size';
        const colour = $('.size-chip[data-colour].is-selected', modal)?.dataset.colour || '';
        const quantity = Math.max(1, Math.min(10, Number($('.product-quantity', modal).value || 1)));
        const matching = cart.find((entry) => entry.name === item.name && entry.size === size && entry.colour === colour);
        if (matching) matching.quantity += quantity;
        else cart.push({ name: item.name, image: $('[data-main-photo]', modal).src, size, colour, quantity, price: Number(item.price) || 0 });
        saveCart();
        root.remove();
        openBag();
      }
    });
  }

  function injectBag() {
    if ($('#bag-drawer')) return;
    document.body.insertAdjacentHTML('beforeend', `<div class="drawer-backdrop"></div><aside class="bag-drawer" id="bag-drawer" role="dialog" aria-modal="true" aria-label="Shopping bag" aria-hidden="true"><div class="drawer-header"><h2>Your bag</h2><button class="drawer-close" type="button" aria-label="Close bag">×</button></div><div class="cart-items"></div>
      <form class="checkout-options"><label>Your name<input name="customer-name" autocomplete="name" required></label><label>Delivery address<input name="customer-address" autocomplete="street-address" placeholder="Required for delivery"></label><label>Delivery option<select name="delivery-option"><option>Delivery (1–5 business days)</option><option>Collection</option></select></label><label>Payment option<select name="payment-option"><option>EFT</option><option>Cash on collection</option><option>Other — confirm by DM</option></select></label></form>
      <div class="bag-summary"><div class="bag-row"><span>Subtotal</span><strong class="bag-subtotal">R0</strong></div><p class="checkout-note">Payment and delivery are confirmed with you before dispatch.</p><button class="primary-action" id="send-invoice" type="button">Place order via WhatsApp</button></div></aside>`);
    $('.drawer-backdrop').addEventListener('click', closeBag);
    $('.drawer-close').addEventListener('click', closeBag);
    $('#send-invoice').addEventListener('click', sendInvoice);
  }
  function drawCart() {
    const target = $('.cart-items');
    if (target) target.innerHTML = cart.length ? cart.map((item, index) => `<article class="cart-item"><img src="${esc(item.image)}" alt="${esc(item.name)}"><div class="cart-item__info"><div class="cart-item__top"><h3>${esc(item.name)}</h3><button type="button" data-remove="${index}" aria-label="Remove ${esc(item.name)}">×</button></div><p>${esc([item.colour, item.size].filter(Boolean).join(' · '))} · ${money(item.price)}</p><div class="qty-picker cart-qty"><button type="button" data-qty="-1" data-index="${index}" aria-label="Decrease quantity">−</button><span>${Number(item.quantity)}</span><button type="button" data-qty="1" data-index="${index}" aria-label="Increase quantity">+</button></div></div></article>`).join('') : '<p class="empty-cart">Your bag is empty.</p>';
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    if ($('.bag-subtotal')) $('.bag-subtotal').textContent = money(subtotal);
    document.querySelectorAll('.bag-count').forEach((element) => { element.textContent = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0); });
  }
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (_) { /* storage may be unavailable */ }
    drawCart();
  }
  function openBag() {
    injectBag(); $('.bag-drawer')?.classList.add('is-open'); $('.drawer-backdrop')?.classList.add('is-open');
    $('.bag-drawer')?.setAttribute('aria-hidden', 'false'); document.body.classList.add('drawer-open'); drawCart();
  }
  function closeBag() {
    $('.bag-drawer')?.classList.remove('is-open'); $('.drawer-backdrop')?.classList.remove('is-open');
    $('.bag-drawer')?.setAttribute('aria-hidden', 'true'); document.body.classList.remove('drawer-open');
  }
  function toast(message) {
    const element = $('.toast'); if (!element) return;
    element.textContent = message; element.classList.add('show'); clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove('show'), 2600);
  }
  function sendInvoice() {
    if (!cart.length) return toast('Your bag is empty');
    const form = $('.checkout-options');
    if (!form.reportValidity()) return;
    const name = form.elements['customer-name'].value.trim();
    const address = form.elements['customer-address'].value.trim();
    const delivery = form.elements['delivery-option'].value;
    const payment = form.elements['payment-option'].value;
    if (delivery.startsWith('Delivery') && !address) return toast('Please enter your delivery address');
    const lines = cart.map((item) => `${item.name}${item.colour ? ` — ${item.colour}` : ''}${item.size ? ` (${item.size})` : ''} x ${item.quantity} — ${money(item.price * item.quantity)}`);
    const subtotal = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
    const message = ['Hello Ambition Wear, I would like to place this order:', '', ...lines, '', `Name: ${name}`, `Delivery: ${delivery}`, ...(address ? [`Address: ${address}`] : []), `Payment: ${payment}`, `Subtotal: ${money(subtotal)}`, 'Please confirm the final total and payment instructions.'].join('\n');
    window.open(`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  }

  function lifestyleFileUrl(file) {
    return assetUrl(`Ambition%20Wear/Ambition%20Lifestyle/${encodeURIComponent(file)}`);
  }
  function addStoryExperience() {
    const hero = $('.story-hero');
    if (!hero) return;
    if (!hero.querySelector('.story-film-background')) {
      const video = '• Two young men spend their days working inside a busy clothing warehouse_ surrounded by boxes_ fabric_ labels_ and unfinished ideas. While everyone else s.mp4';
      hero.insertAdjacentHTML('afterbegin', `<video class="story-film-background" autoplay muted loop playsinline aria-hidden="true" poster="${assetUrl('IMG-20261111-WA0079.jpg')}"><source src="${lifestyleFileUrl(video)}" type="video/mp4"></video><div class="story-film-shade" aria-hidden="true"></div>`);
      hero.classList.add('has-story-film');
    }
    if ($('.story-lifestyle-gallery')) return;
    const images = [
      'AMBITION CLOTHING WEAR RACER T-SHIRT_ PLACE YOUR ORDER THROUGH OUR DMs 🏁🏎️_._._.__fashionstyle _locabrand _durban _music(JPG).jpg',
      'CULT _ AMBITION isn_t just clothing. It_s proof that differences can become strength_ setbacks can become lessons_ and brotherhood can create something gre_1.jpg',
      'CULT _ AMBITION isn_t just clothing. It_s proof that differences can become strength_ setbacks can become lessons_ and brotherhood can create something gre_2.jpg',
      'CULT _ AMBITION isn_t just clothing. It_s proof that differences can become strength_ setbacks can become lessons_ and brotherhood can create something grea(.jpg',
      'Fit by __ambition_clothing_wear(WEBP).webp',
      'Fit by __ambition_clothing_wear(WEBP)_1.webp',
      'For the Streets___ __ _._._._._._._._._._._._._._._._._._._._._._.__instagood _fashion _art _photography  _followme _like4like  _style  _instadaily _insta_1.webp',
      'For the Streets___ __ _._._._._._._._._._._._._._._._._._._._._._.__instagood _fashion _art _photography  _followme _like4like  _style  _instadaily _insta_2.webp'
    ];
    const gallery = document.createElement('section');
    gallery.className = 'story-lifestyle-gallery wrap';
    gallery.innerHTML = `<div class="story-gallery-heading"><p class="eyebrow">THE AMBITION LIFESTYLE</p><h2>Streetwear is the look.<br><span>Ambition is the mindset.</span></h2></div><div class="story-gallery-grid">${images.map((file, index) => `<figure class="story-gallery-card"><img src="${esc(lifestyleFileUrl(file))}" alt="Ambition lifestyle campaign photo ${index + 1}" loading="lazy"><figcaption>AMBITION · ${String(index + 1).padStart(2, '0')}</figcaption></figure>`).join('')}</div>`;
    const story = $('.story-content');
    if (story) story.insertAdjacentElement('afterend', gallery);
    else hero.insertAdjacentElement('afterend', gallery);
  }
  function addMotionStyles() {
    if ($('#ambition-motion-styles')) return;
    const style = document.createElement('style'); style.id = 'ambition-motion-styles';
    style.textContent = `
      .product-card{animation:ambition-rise .55s both;animation-delay:calc(var(--card-index,0)*45ms);transition:transform .25s ease,box-shadow .25s ease;cursor:pointer}.product-card:hover{transform:translateY(-5px);box-shadow:0 15px 35px #00000014}.product-card__slide{transition:opacity .25s ease,transform .45s ease}.product-card:hover .product-card__slide{transform:scale(1.025)}
      .product-modal-root{z-index:10000}.product-modal{animation:ambition-pop .25s ease-out}.product-modal__thumb{transition:border-color .2s,transform .2s}.product-modal__thumb:hover{transform:translateY(-3px)}
      .story-hero.has-story-film{position:relative;min-height:min(90vh,900px);overflow:hidden;background:#111}.story-film-background,.story-film-shade{position:absolute;inset:0;width:100%;height:100%}.story-film-background{object-fit:cover}.story-film-shade{background:linear-gradient(90deg,rgba(0,0,0,.72),rgba(0,0,0,.2))}.story-hero .wrap{position:relative;z-index:1}.story-hero .eyebrow,.story-hero h1,.story-hero p{color:#fff}
      .story-lifestyle-gallery{padding-top:clamp(42px,8vw,100px);padding-bottom:clamp(48px,8vw,110px)}.story-gallery-heading{margin-bottom:28px}.story-gallery-heading h2{font-size:clamp(28px,5vw,56px);line-height:1.04}.story-gallery-heading h2 span{color:#777}.story-gallery-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}.story-gallery-card{margin:0;overflow:hidden;background:#f1efeb;animation:ambition-rise .7s both;animation-delay:calc(var(--gallery-index,0)*55ms)}.story-gallery-card:nth-child(4n+1){grid-row:span 2}.story-gallery-card img{display:block;width:100%;height:100%;min-height:180px;aspect-ratio: .78;object-fit:cover;transition:transform .5s ease}.story-gallery-card:hover img{transform:scale(1.05)}.story-gallery-card figcaption{padding:10px;font-size:10px;letter-spacing:.14em}
      .checkout-options{display:grid;gap:12px;padding:18px 22px}.checkout-options label{display:grid;gap:6px;font-size:12px;font-weight:700}.checkout-options input,.checkout-options select{width:100%;min-height:42px;padding:9px 10px;border:1px solid #ddd;background:#fff;color:#111;font:inherit}.checkout-note{padding:0 22px;font-size:12px;color:#666}
      @keyframes ambition-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}@keyframes ambition-pop{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
      @media(max-width:850px){.story-gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.story-gallery-card:nth-child(4n+1){grid-row:auto}}
      @media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}}
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (link && /view\s+(all\s+)?items|shop\s+now|shop\s+collection/i.test(link.textContent.trim())) {
      const grid = $('#shop-products, #shop-grid');
      if (grid) { event.preventDefault(); grid.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      if (/index\.html|#featured|#shop/i.test(link.getAttribute('href') || '')) {
        event.preventDefault(); window.location.href = 'shop.html#shop-grid'; return;
      }
    }
    const filter = event.target.closest('[data-filter]');
    if (filter) { activeCategory = filter.dataset.filter; drawFilters(); render(); return; }
    const card = event.target.closest('.product-card[data-product-index]');
    if (card) {
      const list = card.closest('#featured-products') ? products.slice(0, 4) : visibleProducts();
      const item = list[Number(card.dataset.productIndex)];
      if (item) openProduct(item);
      return;
    }
    const remove = event.target.closest('[data-remove]');
    if (remove) { cart.splice(Number(remove.dataset.remove), 1); saveCart(); return; }
    const quantity = event.target.closest('[data-qty][data-index]');
    if (quantity) {
      const index = Number(quantity.dataset.index);
      if (!cart[index]) return;
      cart[index].quantity = Math.max(1, Number(cart[index].quantity || 1) + Number(quantity.dataset.qty));
      saveCart(); return;
    }
    if (event.target.closest('.bag-open, [data-open-bag], .bag-count')) openBag();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { closeBag(); $('.product-modal-root')?.remove(); }
    const card = event.target.closest?.('.product-card[data-product-index]');
    if (card && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      const list = card.closest('#featured-products') ? products.slice(0, 4) : visibleProducts();
      const item = list[Number(card.dataset.productIndex)];
      if (item) openProduct(item);
    }
  });

  function init() {
    injectBag(); drawCart();
    document.querySelectorAll('.year').forEach((element) => { element.textContent = new Date().getFullYear(); });
    addMotionStyles(); addStoryExperience();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();

  fetchCatalog().then((items) => {
    if (!Array.isArray(items)) throw new Error('Invalid catalog');
    products = prepareProducts(items); drawFilters(); render();
    const requestedCategory = new URLSearchParams(window.location.search).get('category');
    if (requestedCategory) {
      const button = [...document.querySelectorAll('[data-filter]')].find((item) => item.dataset.filter.toLowerCase() === requestedCategory.trim().toLowerCase());
      button?.click();
    }
  }).catch(() => {
    products = [];
    const grid = $('#shop-products, #shop-grid');
    if (grid) grid.innerHTML = '<p class="loading">The collection could not be loaded. Please refresh to try again.</p>';
    console.warn('Ambition catalog could not be loaded.');
  });
})();
