/**
 * حلواني الأصيل بسوهاج - Al-Aseel Confectionery Core Logic
 * نظام إدارة التفاعلات، تصفية المنيو، الطلب المخصص، السلة، الخريطة، والوضع الليلي
 */

// --- 1. State Management ---
const AppState = {
  theme: localStorage.getItem('alaseel_theme') || 'dark',
  activeCategory: 'all',
  searchQuery: '',
  selectedProduct: null,
  quantity: 1,
  activeBranchId: 'mazen-nadi-bahri',
  // Custom Order State
  customOrder: {
    type: 'cake',
    size: 'medium',
    flavor: 'vanilla',
    fillings: ['nutella'],
    occasion: 'wedding',
    trayType: 'royal_mix',
    sweets: ['basbousa_hazelnut', 'kunafa_osmanliya'],
    date: '',
    notes: '',
    branch: 'mazen-nadi-bahri'
  }
};

// --- 2. Theme Manager (Dark / Light) ---
const ThemeManager = {
  init() {
    this.apply(AppState.theme);
    const toggles = document.querySelectorAll('.theme-toggle-btn');
    toggles.forEach(btn => {
      btn.addEventListener('click', () => {
        AppState.theme = AppState.theme === 'dark' ? 'light' : 'dark';
        this.apply(AppState.theme);
      });
    });
  },
  apply(theme) {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('alaseel_theme', theme);
  }
};

// --- 3. Scroll Progress & Sticky Header ---
const ScrollManager = {
  init() {
    const progressBar = document.getElementById('scroll-progress');
    const header = document.getElementById('main-header');
    const scrollBtn = document.getElementById('scroll-top-btn');

    window.addEventListener('scroll', () => {
      const scrollPx = document.documentElement.scrollTop;
      const winHeightPx = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      if (winHeightPx > 0 && progressBar) {
        progressBar.style.width = `${(scrollPx / winHeightPx) * 100}%`;
      }

      if (header) {
        if (scrollPx > 30) {
          header.classList.add('shadow-[0_4px_25px_rgba(212,175,55,0.2)]', 'py-2');
          header.classList.remove('py-3');
        } else {
          header.classList.remove('shadow-[0_4px_25px_rgba(212,175,55,0.2)]', 'py-2');
          header.classList.add('py-3');
        }
      }

      if (scrollBtn) {
        if (scrollPx > 400) {
          scrollBtn.classList.remove('opacity-0', 'pointer-events-none', 'translate-y-4');
        } else {
          scrollBtn.classList.add('opacity-0', 'pointer-events-none', 'translate-y-4');
        }
      }
    }, { passive: true });

    if (scrollBtn) {
      scrollBtn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }
};

// --- 4. Menu & Products Catalog Rendering & Filtering ---
const CatalogManager = {
  init() {
    this.renderProducts();
    this.setupFilters();
    this.setupSearch();
  },

  renderProducts() {
    const container = document.getElementById('products-grid');
    if (!container) return;

    let filtered = productsData.filter(p => {
      const matchCat = AppState.activeCategory === 'all' || p.category === AppState.activeCategory;
      const matchSearch = p.name.includes(AppState.searchQuery) || 
                          p.description.includes(AppState.searchQuery) ||
                          p.ingredients.some(i => i.includes(AppState.searchQuery));
      return matchCat && matchSearch;
    });

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="col-span-full py-16 text-center text-[#F3E5AB]/60">
          <i class="fas fa-cookie-bite text-4xl mb-3 text-[#D4AF37]"></i>
          <p class="text-base font-bold">عذراً، لم نجد حلويات تطابق بحثك</p>
          <button onclick="CatalogManager.resetFilter()" class="mt-4 px-5 py-2 rounded-xl bg-[#D4AF37] text-black font-bold text-xs hover:bg-[#C5A059] transition-all">
            عرض كافة الحلويات
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(product => `
      <div class="group bg-[#141414] rounded-3xl overflow-hidden border border-[#D4AF37]/20 hover:border-[#D4AF37]/60 transition-all duration-300 flex flex-col hover:-translate-y-1.5 shadow-lg">
        <!-- Image & Badge -->
        <div class="relative h-56 w-full overflow-hidden bg-black/40">
          <img 
            src="${product.image}" 
            alt="${product.name}" 
            loading="lazy" 
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <span class="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/80 backdrop-blur-md text-[#D4AF37] text-xs font-bold border border-[#D4AF37]/40 shadow-md">
            ${product.badge}
          </span>
          <span class="absolute bottom-3 left-3 px-3 py-1 rounded-xl bg-black/80 backdrop-blur-md text-white text-xs font-bold border border-[#D4AF37]/30">
            ${product.price} ج.م <span class="text-[10px] text-neutral-400">/ ${product.unit}</span>
          </span>
        </div>

        <!-- Content -->
        <div class="p-5 flex-1 flex flex-col justify-between text-right">
          <div>
            <h3 class="text-base font-black text-[#F3E5AB] group-hover:text-[#D4AF37] transition-colors leading-snug mb-2 font-serif-arabic">
              ${product.name}
            </h3>
            <p class="text-xs text-[#F3E5AB]/70 leading-relaxed line-clamp-2 mb-3 font-light">
              ${product.description}
            </p>
            <div class="flex items-center gap-1.5 text-[11px] text-[#D4AF37] mb-4">
              <i class="fas fa-check-circle"></i>
              <span>${product.butterType}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 pt-3 border-t border-[#D4AF37]/15">
            <button 
              onclick="ModalManager.openProductModal(${product.id})" 
              class="flex-1 py-2.5 px-3 rounded-xl bg-[#1f1f1f] hover:bg-[#282828] text-[#F3E5AB] text-xs font-bold border border-[#D4AF37]/30 transition-all flex items-center justify-center gap-1.5"
            >
              <i class="fas fa-eye text-[#D4AF37]"></i>
              <span>تفاصيل</span>
            </button>
            <a 
              href="https://wa.me/201225254447?text=${encodeURIComponent(`السلام عليكم، أرغب في طلب: ${product.name} (${product.price} ج.م)`)}" 
              target="_blank" 
              class="flex-1 py-2.5 px-3 rounded-xl bg-[#D4AF37] hover:bg-[#C5A059] text-black text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              <i class="fab fa-whatsapp text-sm"></i>
              <span>اطلب الآن</span>
            </a>
          </div>
        </div>
      </div>
    `).join('');
  },

  setupFilters() {
    const buttons = document.querySelectorAll('[data-cat-btn]');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => {
          b.classList.remove('bg-[#D4AF37]', 'text-black', 'border-[#D4AF37]');
          b.classList.add('bg-[#141414]', 'text-[#F3E5AB]/80', 'border-[#D4AF37]/25');
        });
        btn.classList.add('bg-[#D4AF37]', 'text-black', 'border-[#D4AF37]');
        btn.classList.remove('bg-[#141414]', 'text-[#F3E5AB]/80', 'border-[#D4AF37]/25');
        AppState.activeCategory = btn.getAttribute('data-cat-btn');
        this.renderProducts();
      });
    });
  },

  setupSearch() {
    const input = document.getElementById('search-input');
    if (input) {
      input.addEventListener('input', (e) => {
        AppState.searchQuery = e.target.value.trim();
        this.renderProducts();
      });
    }
  },

  resetFilter() {
    AppState.activeCategory = 'all';
    AppState.searchQuery = '';
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    this.setupFilters();
    this.renderProducts();
  }
};

// --- 5. Modal Manager ---
const ModalManager = {
  openProductModal(id) {
    const product = productsData.find(p => p.id === id);
    if (!product) return;

    AppState.selectedProduct = product;
    AppState.quantity = 1;

    const modal = document.getElementById('product-modal');
    const container = document.getElementById('modal-content');
    if (!modal || !container) return;

    container.innerHTML = `
      <div class="relative bg-[#121212] rounded-3xl overflow-hidden border-2 border-[#D4AF37] max-w-xl w-full text-right shadow-2xl">
        <button onclick="ModalManager.closeModal()" class="absolute top-4 left-4 z-20 w-8 h-8 rounded-full bg-black/80 text-[#D4AF37] border border-[#D4AF37]/40 flex items-center justify-center hover:scale-110 transition-transform">
          <i class="fas fa-times"></i>
        </button>

        <div class="h-64 w-full relative">
          <img src="${product.image}" alt="${product.name}" class="w-full h-full object-cover">
          <div class="absolute inset-0 bg-gradient-to-t from-[#121212] via-transparent to-black/30"></div>
          <span class="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/80 text-[#D4AF37] font-bold text-xs border border-[#D4AF37]/40">
            ${product.badge}
          </span>
        </div>

        <div class="p-6 space-y-4">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 class="text-xl font-black text-[#F3E5AB] font-serif-arabic">${product.name}</h3>
              <p class="text-xs text-[#D4AF37] mt-1 font-bold"><i class="fas fa-check-circle ml-1"></i>${product.butterType}</p>
            </div>
            <div class="text-left shrink-0">
              <span class="text-2xl font-black text-[#D4AF37]">${product.price}</span>
              <span class="text-xs text-[#F3E5AB]/60 block font-light">ج.م / ${product.unit}</span>
            </div>
          </div>

          <p class="text-sm text-[#F3E5AB]/80 leading-relaxed font-light">${product.description}</p>

          <div class="bg-[#1a1a1a] p-4 rounded-2xl border border-[#D4AF37]/20">
            <h4 class="text-xs font-bold text-[#D4AF37] mb-2">المكونات الطبيعية:</h4>
            <div class="flex flex-wrap gap-1.5">
              ${product.ingredients.map(ing => `
                <span class="px-2.5 py-1 rounded-lg bg-black/40 text-[11px] text-[#F3E5AB] border border-[#D4AF37]/20">
                  ${ing}
                </span>
              `).join('')}
            </div>
          </div>

          <!-- Quantity Control -->
          <div class="flex items-center justify-between pt-2">
            <span class="text-xs font-bold text-[#F3E5AB]">الكمية المطلوبة:</span>
            <div class="flex items-center gap-3 bg-[#1c1c1c] px-3 py-1.5 rounded-xl border border-[#D4AF37]/30">
              <button onclick="ModalManager.updateQty(-1)" class="w-6 h-6 rounded-lg bg-black text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center font-bold">
                -
              </button>
              <span id="modal-qty" class="text-sm font-black text-[#D4AF37] w-6 text-center">1</span>
              <button onclick="ModalManager.updateQty(1)" class="w-6 h-6 rounded-lg bg-black text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center font-bold">
                +
              </button>
            </div>
          </div>

          <!-- Submit Order -->
          <button onclick="ModalManager.submitWhatsAppOrder()" class="w-full py-3.5 rounded-2xl bg-[#D4AF37] hover:bg-[#C5A059] text-black font-black text-sm transition-all shadow-lg flex items-center justify-center gap-2">
            <i class="fab fa-whatsapp text-lg"></i>
            <span>تأكيد الطلب الفوري عبر واتساب (<span id="modal-total">${product.price}</span> ج.م)</span>
          </button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  },

  updateQty(delta) {
    if (!AppState.selectedProduct) return;
    AppState.quantity = Math.max(1, AppState.quantity + delta);
    const qtyEl = document.getElementById('modal-qty');
    const totalEl = document.getElementById('modal-total');
    if (qtyEl) qtyEl.innerText = AppState.quantity;
    if (totalEl) totalEl.innerText = AppState.quantity * AppState.selectedProduct.price;
  },

  submitWhatsAppOrder() {
    if (!AppState.selectedProduct) return;
    const total = AppState.quantity * AppState.selectedProduct.price;
    const msg = `السلام عليكم حلواني الأصيل بسوهاج 🍰\nأود طلب التالي:\n• الصنف: ${AppState.selectedProduct.name}\n• الكمية: ${AppState.quantity} (${AppState.selectedProduct.unit})\n• الإجمالي: ${total} ج.م\n\nبرجاء التأكيد وإرسال التوصيل.`;
    window.open(`https://wa.me/201225254447?text=${encodeURIComponent(msg)}`, '_blank');
    this.closeModal();
  },

  closeModal() {
    const modal = document.getElementById('product-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
    document.body.style.overflow = '';
  }
};

// --- 6. Custom Order Calculator & Logic ---
const CustomOrderManager = {
  init() {
    this.setupListeners();
    this.updateCalculation();
  },

  setupListeners() {
    // Switch between Cake and Sweets Tray
    const typeButtons = document.querySelectorAll('[data-order-type]');
    typeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        typeButtons.forEach(b => {
          b.classList.remove('bg-[#D4AF37]', 'text-black', 'border-[#D4AF37]');
          b.classList.add('bg-[#141414]', 'text-[#F3E5AB]/80', 'border-[#D4AF37]/25');
        });
        btn.classList.add('bg-[#D4AF37]', 'text-black', 'border-[#D4AF37]');
        btn.classList.remove('bg-[#141414]', 'text-[#F3E5AB]/80', 'border-[#D4AF37]/25');

        AppState.customOrder.type = btn.getAttribute('data-order-type');
        document.getElementById('cake-options-panel').classList.toggle('hidden', AppState.customOrder.type !== 'cake');
        document.getElementById('tray-options-panel').classList.toggle('hidden', AppState.customOrder.type !== 'sweets_tray');
        this.updateCalculation();
      });
    });

    // Form inputs change
    const form = document.getElementById('custom-order-form');
    if (form) {
      form.addEventListener('change', () => this.updateCalculation());
    }
  },

  updateCalculation() {
    let total = 0;
    const type = AppState.customOrder.type;

    if (type === 'cake') {
      const sizeEl = document.querySelector('input[name="cake-size"]:checked');
      const flavorEl = document.querySelector('input[name="cake-flavor"]:checked');
      const basePrice = sizeEl ? parseInt(sizeEl.getAttribute('data-price') || 420) : 420;
      const flavorPrice = flavorEl ? parseInt(flavorEl.getAttribute('data-price') || 0) : 0;
      
      let fillingsPrice = 0;
      document.querySelectorAll('input[name="cake-filling"]:checked').forEach(cb => {
        fillingsPrice += parseInt(cb.getAttribute('data-price') || 0);
      });

      total = basePrice + flavorPrice + fillingsPrice;
    } else {
      const trayEl = document.querySelector('input[name="tray-type"]:checked');
      total = trayEl ? parseInt(trayEl.getAttribute('data-price') || 580) : 580;
    }

    const priceDisplay = document.getElementById('custom-order-price');
    if (priceDisplay) {
      priceDisplay.innerText = `${total} ج.م`;
    }
  },

  submitCustomOrder() {
    const isCake = AppState.customOrder.type === 'cake';
    const occasion = document.querySelector('select[name="order-occasion"]')?.value || 'مناسبة خاصة';
    const date = document.getElementById('order-date')?.value || 'في أقرب وقت';
    const branch = document.querySelector('select[name="order-branch"]')?.value || 'فرع شارع مازن';
    const notes = document.getElementById('order-notes')?.value || 'بدون ملاحظات إضافية';
    const price = document.getElementById('custom-order-price')?.innerText || '';

    let details = '';
    if (isCake) {
      const size = document.querySelector('input[name="cake-size"]:checked')?.parentElement?.textContent?.trim() || 'وسط';
      const flavor = document.querySelector('input[name="cake-flavor"]:checked')?.parentElement?.textContent?.trim() || 'فانيلا';
      details = `• نوع الطلب: تورتة مناسبات خاصة\n• المقاس: ${size}\n• النكهة: ${flavor}`;
    } else {
      const tray = document.querySelector('input[name="tray-type"]:checked')?.parentElement?.textContent?.trim() || 'صينية مشكلة';
      details = `• نوع الطلب: صينية ضيافة مشكلة\n• التشكيلة: ${tray}`;
    }

    const msg = `السلام عليكم حلواني الأصيل بسوهاج 👑\nأود تفصيل طلبية خاصة:\n${details}\n• المناسبة: ${occasion}\n• تاريخ الاستلام: ${date}\n• فرع الاستلام المفضل: ${branch}\n• ملاحظات خاصة: ${notes}\n• التكلفة التقديرية: ${price}\n\nبرجاء مراجعة الطلب والتأكيد معي.`;

    window.open(`https://wa.me/201225254447?text=${encodeURIComponent(msg)}`, '_blank');
  }
};

// --- 7. Branches Interactive View & Map ---
const BranchesManager = {
  init() {
    this.renderBranchesList();
    this.renderMap();
  },

  renderBranchesList() {
    const container = document.getElementById('branches-list');
    if (!container) return;

    container.innerHTML = branchesData.map(b => `
      <div 
        onclick="BranchesManager.selectBranch('${b.id}')" 
        id="branch-card-${b.id}"
        class="cursor-pointer p-4 rounded-2xl bg-[#141414] border ${b.id === AppState.activeBranchId ? 'border-[#D4AF37] bg-[#1a1810]' : 'border-[#D4AF37]/20 hover:border-[#D4AF37]/50'} transition-all text-right group"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-bold border border-[#D4AF37]/30">
            ${b.area}
          </span>
          <span class="text-xs text-amber-400 font-bold">
            <i class="fas fa-star text-xs ml-1"></i>${b.rating}
          </span>
        </div>
        <h4 class="text-sm font-black text-[#F3E5AB] group-hover:text-[#D4AF37] transition-colors mb-1 font-serif-arabic">
          ${b.name}
        </h4>
        <p class="text-xs text-[#F3E5AB]/70 mb-2 font-light leading-relaxed">
          ${b.address}
        </p>
        <div class="flex items-center justify-between text-[11px] text-[#D4AF37] pt-2 border-t border-[#D4AF37]/15">
          <span><i class="far fa-clock ml-1"></i>${b.hours}</span>
          <a href="${b.directionsUrl}" target="_blank" class="hover:underline flex items-center gap-1 font-bold">
            <span>الاتجاهات</span>
            <i class="fas fa-location-arrow text-[10px]"></i>
          </a>
        </div>
      </div>
    `).join('');
  },

  selectBranch(id) {
    AppState.activeBranchId = id;
    this.renderBranchesList();
    const branch = branchesData.find(b => b.id === id);
    if (branch && window.alaseelMap) {
      window.alaseelMap.setView([branch.lat, branch.lng], 16);
      if (window.branchMarkers && window.branchMarkers[id]) {
        window.branchMarkers[id].openPopup();
      }
    }
  },

  renderMap() {
    const mapEl = document.getElementById('leaflet-map');
    if (!mapEl || typeof L === 'undefined') return;

    const map = L.map('leaflet-map', {
      center: [26.5615, 31.6990],
      zoom: 14,
      scrollWheelZoom: false
    });
    window.alaseelMap = map;
    window.branchMarkers = {};

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    branchesData.forEach(branch => {
      const marker = L.marker([branch.lat, branch.lng]).addTo(map);
      marker.bindPopup(`
        <div style="direction: rtl; text-align: right; font-family: 'Cairo', sans-serif;">
          <h4 style="font-weight: 900; color: #b3822a; margin: 0 0 4px 0;">${branch.name}</h4>
          <p style="font-size: 11px; margin: 0 0 6px 0;">${branch.address}</p>
          <a href="${branch.directionsUrl}" target="_blank" style="font-size: 11px; color: #b3822a; font-weight: bold; text-decoration: none;">
            📍 فتح في خرائط جوجل
          </a>
        </div>
      `);
      window.branchMarkers[branch.id] = marker;
    });
  }
};

// --- 8. Testimonials Review Form to WhatsApp ---
const TestimonialsManager = {
  submitReview(e) {
    e.preventDefault();
    const name = document.getElementById('rev-name')?.value.trim();
    const loc = document.getElementById('rev-loc')?.value.trim();
    const item = document.getElementById('rev-item')?.value.trim();
    const rating = document.getElementById('rev-rating')?.value || '5';
    const text = document.getElementById('rev-text')?.value.trim();

    if (!name || !text) return;

    const stars = '⭐'.repeat(parseInt(rating));
    const msg = `السلام عليكم حلواني الأصيل بسوهاج 🌟\nأود مشاركة تقييمي لحلوياتكم:\n• الاسم: ${name}\n• المنطقة: ${loc}\n• الصنف: ${item}\n• التقييم: ${rating} من 5 (${stars})\n• رأيي: "${text}"\n\nشكراً لكم على أمانة الصنعة والسمن البلدي!`;

    window.open(`https://wa.me/201225254447?text=${encodeURIComponent(msg)}`, '_blank');
    alert('شكراً لك! سيتم فتح واتساب لإرسال تقييمك لمراجعته ونشره.');
  }
};

// --- 9. Mobile Navigation Drawer ---
const MobileNavManager = {
  init() {
    const btn = document.getElementById('mobile-menu-btn');
    const drawer = document.getElementById('mobile-nav-drawer');
    const closeBtn = document.getElementById('close-mobile-nav');

    if (btn && drawer) {
      btn.addEventListener('click', () => drawer.classList.toggle('hidden'));
    }
    if (closeBtn && drawer) {
      closeBtn.addEventListener('click', () => drawer.classList.add('hidden'));
    }

    document.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (drawer) drawer.classList.add('hidden');
      });
    });
  }
};

// --- 10. Security & Source Code / Asset Protection ---
const SecurityManager = {
  init() {
    this.disableRightClick();
    this.disableDevToolsShortcuts();
    this.disableDragAndDropImages();
    this.disablePrintAndSave();
  },

  // منع كليك يمين لحماية الصور والنصوص والكود
  disableRightClick() {
    document.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      return false;
    });
  },

  // منع اختصارات المطورين وسرقة الكود (F12, Ctrl+U, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+S)
  disableDevToolsShortcuts() {
    document.addEventListener('keydown', (e) => {
      // F12
      if (e.keyCode === 123) {
        e.preventDefault();
        return false;
      }
      // Ctrl + Shift + I (Inspect Elements)
      if (e.ctrlKey && e.shiftKey && (e.keyCode === 73 || e.key === 'I' || e.key === 'i')) {
        e.preventDefault();
        return false;
      }
      // Ctrl + Shift + J (Console)
      if (e.ctrlKey && e.shiftKey && (e.keyCode === 74 || e.key === 'J' || e.key === 'j')) {
        e.preventDefault();
        return false;
      }
      // Ctrl + Shift + C (Element Selector)
      if (e.ctrlKey && e.shiftKey && (e.keyCode === 67 || e.key === 'C' || e.key === 'c')) {
        e.preventDefault();
        return false;
      }
      // Ctrl + U (View Source Code)
      if (e.ctrlKey && (e.keyCode === 85 || e.key === 'U' || e.key === 'u')) {
        e.preventDefault();
        return false;
      }
      // Ctrl + S (Save Page / Assets)
      if (e.ctrlKey && (e.keyCode === 83 || e.key === 'S' || e.key === 's')) {
        e.preventDefault();
        return false;
      }
    });
  },

  // منع سحب وإفلات الصور وتنزيلها بالسحب
  disableDragAndDropImages() {
    document.addEventListener('dragstart', (e) => {
      if (e.target.tagName === 'IMG' || e.target.tagName === 'svg') {
        e.preventDefault();
        return false;
      }
    });
  },

  // منع الطباعة المباشرة (Ctrl+P)
  disablePrintAndSave() {
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && (e.keyCode === 80 || e.key === 'P' || e.key === 'p')) {
        e.preventDefault();
        return false;
      }
    });
  }
};

// --- Initializer on Page Load ---
document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  ScrollManager.init();
  CatalogManager.init();
  CustomOrderManager.init();
  BranchesManager.init();
  MobileNavManager.init();
  SecurityManager.init();

  // Initialize Lucide icons if available
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

