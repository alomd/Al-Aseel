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

// --- 2. Theme Manager (Dark / Light with Circular Reveal Transition) ---
const ThemeManager = {
  init() {
    this.apply(AppState.theme);
    const toggles = document.querySelectorAll('.theme-toggle-btn');
    toggles.forEach(btn => {
      btn.addEventListener('click', (event) => {
        // Aesthetic ripple & spin animation on button itself
        btn.classList.add('theme-toggle-clicked');
        setTimeout(() => btn.classList.remove('theme-toggle-clicked'), 600);

        const newTheme = AppState.theme === 'dark' ? 'light' : 'dark';
        this.toggleWithTransition(newTheme, event);
      });
    });
  },

  toggleWithTransition(newTheme, event) {
    if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      AppState.theme = newTheme;
      this.apply(newTheme);
      return;
    }

    let x = window.innerWidth / 2;
    let y = 0;
    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
      x = rect.left + rect.width / 2;
      y = rect.top + rect.height / 2;
    }

    const endRadius = Math.hypot(
      Math.max(x, window.innerWidth - x),
      Math.max(y, window.innerHeight - y)
    );

    // Disable CSS color transitions temporarily so they don't fight with the view transition snapshot
    document.documentElement.classList.add('no-theme-transition');

    const transition = document.startViewTransition(() => {
      AppState.theme = newTheme;
      this.apply(newTheme);
    });

    transition.ready.then(() => {
      const clipPath = [
        `circle(0px at ${x}px ${y}px)`,
        `circle(${endRadius}px at ${x}px ${y}px)`
      ];

      const anim = document.documentElement.animate(
        {
          clipPath: clipPath
        },
        {
          duration: 520,
          easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
          pseudoElement: '::view-transition-new(root)'
        }
      );

      anim.onfinish = () => {
        document.documentElement.classList.remove('no-theme-transition');
      };
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
  viewMode: 'art', // 'art' (illustrated map) or 'leaflet' (live street map)
  isDarkMode: true,
  userLocation: null,
  userMarker: null,
  distances: {},

  init() {
    this.renderBranchesList();
    this.renderArtPins();
    this.updateActiveBranchDisplay(branchesData[0]);
  },

  renderArtPins() {
    const container = document.getElementById('art-map-pins');
    if (!container) return;

    container.innerHTML = branchesData.map(b => {
      const isSelected = b.id === AppState.activeBranchId;
      const coords = b.mapCoordsPercent || { x: 50, y: 50 };

      return `
        <div 
          onclick="event.stopPropagation(); BranchesManager.selectBranch('${b.id}');"
          class="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 group/pin z-20"
          style="left: ${coords.x}%; top: ${coords.y}%;"
          title="${b.name}"
        >
          <div class="relative flex flex-col items-center justify-center">
            
            <!-- Floating Preview Card on Hover or Active -->
            <div class="absolute bottom-full mb-3 p-1.5 rounded-2xl bg-[#141414]/95 backdrop-blur-md border border-[#D4AF37]/50 shadow-2xl pointer-events-none ${isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-90 group-hover/pin:opacity-100 group-hover/pin:scale-100'} transition-all duration-300 flex items-center gap-2 w-48 text-right z-30">
              <img src="${b.image}" alt="${b.name}" class="w-10 h-10 rounded-xl object-cover border border-[#D4AF37]/40 shrink-0" onerror="this.src='./hero_oriental_pastry_atelier_1790628925750.jpg'" />
              <div class="overflow-hidden">
                <span class="text-[11px] font-black text-[#F3E5AB] block truncate font-serif-arabic">${b.name}</span>
                <span class="text-[9px] text-[#fae084] font-bold block">⭐ ${b.rating} • ${b.area}</span>
              </div>
            </div>

            <!-- Pulse Radar Glow -->
            <div class="absolute w-12 h-12 rounded-full bg-[#D4AF37]/50 ${isSelected ? 'animate-ping' : 'opacity-0 group-hover/pin:opacity-100'} transition-opacity"></div>
            
            <!-- Golden Branch Pin with Photo Avatar inside -->
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#fae084] via-[#D4AF37] to-[#94671e] p-0.5 shadow-2xl flex items-center justify-center transition-all duration-300 ${isSelected ? 'scale-125 ring-4 ring-[#D4AF37]/70' : 'group-hover/pin:scale-115'}">
              <div class="w-full h-full bg-[#111111] rounded-[14px] overflow-hidden flex items-center justify-center relative">
                <img src="${b.image}" alt="${b.name}" class="w-full h-full object-cover opacity-80" onerror="this.src='./hero_oriental_pastry_atelier_1790628925750.jpg'" />
                <div class="absolute inset-0 bg-black/30 flex items-center justify-center">
                  <i class="fas fa-crown text-[10px] text-[#fae084] drop-shadow-md"></i>
                </div>
              </div>
            </div>

            <!-- Pin Bottom Indicator Tip -->
            <div class="w-1.5 h-1.5 rounded-full bg-[#fae084] mt-1 shadow-md"></div>

          </div>
        </div>
      `;
    }).join('');
  },

  toggleViewMode() {
    const artView = document.getElementById('illustrated-art-view');
    const leafView = document.getElementById('leaflet-map-view');
    const textEl = document.getElementById('view-mode-text');

    if (this.viewMode === 'art') {
      this.viewMode = 'leaflet';
      if (artView) artView.classList.add('hidden');
      if (leafView) leafView.classList.remove('hidden');
      if (textEl) textEl.textContent = 'الخريطة التراثية الفنية';
      
      // Render or resize leaflet map
      if (!window.alaseelMap) {
        this.renderMap();
      } else {
        setTimeout(() => window.alaseelMap.invalidateSize(), 200);
      }
    } else {
      this.viewMode = 'art';
      if (artView) artView.classList.remove('hidden');
      if (leafView) leafView.classList.add('hidden');
      if (textEl) textEl.textContent = 'خريطة الشوارع التفاعلية';
      this.renderArtPins();
    }
  },

  openActiveBranchInGoogleMaps() {
    const branch = branchesData.find(b => b.id === AppState.activeBranchId) || branchesData[0];
    if (branch && branch.directionsUrl) {
      window.open(branch.directionsUrl, '_blank');
    }
  },

  updateActiveBranchDisplay(branch) {
    const nameEl = document.getElementById('art-active-branch-name');
    const linkEl = document.getElementById('art-map-direct-link');
    if (nameEl) nameEl.textContent = branch.name;
    if (linkEl) linkEl.href = branch.directionsUrl;
  },

  getDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  },

  locateNearestBranch() {
    const btn = document.getElementById('locate-nearest-btn');
    if (!navigator.geolocation) {
      alert('خدمة تحديد الموقع الجغرافي غير مدعومة في متصفحك.');
      return;
    }

    if (btn) {
      btn.innerHTML = '<i class="fas fa-spinner fa-spin ml-1.5 text-black"></i> جاري تحديد موقعك في سوهاج...';
      btn.disabled = true;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;
        this.userLocation = { lat: userLat, lng: userLng };

        let nearestBranch = null;
        let minDistance = Infinity;

        branchesData.forEach(b => {
          const dist = this.getDistanceKm(userLat, userLng, b.lat, b.lng);
          this.distances[b.id] = dist;
          if (dist < minDistance) {
            minDistance = dist;
            nearestBranch = b;
          }
        });

        if (btn && nearestBranch) {
          btn.innerHTML = `<i class="fas fa-check-circle ml-1.5 text-black"></i> أقرب فرع: ${nearestBranch.name} (${minDistance} كم)`;
          setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-location-crosshairs text-black"></i> <span>تحديد أقرب فرع لموقعي 📍</span>';
            btn.disabled = false;
          }, 6000);
        }

        this.renderBranchesList();

        if (nearestBranch) {
          this.selectBranch(nearestBranch.id);
        }
      },
      (err) => {
        if (btn) {
          btn.innerHTML = '<i class="fas fa-exclamation-triangle ml-1.5 text-amber-900"></i> يرجى تفعيل إذن الموقع';
          btn.disabled = false;
          setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-location-crosshairs text-black"></i> <span>تحديد أقرب فرع لموقعي 📍</span>';
          }, 3500);
        }
        console.warn('Geolocation error:', err);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  },

  renderBranchesList() {
    const container = document.getElementById('branches-list');
    if (!container) return;

    container.innerHTML = branchesData.map(b => {
      const isSelected = b.id === AppState.activeBranchId;
      const distance = this.distances[b.id];

      return `
        <div 
          onclick="BranchesManager.selectBranch('${b.id}')" 
          id="branch-card-${b.id}"
          class="cursor-pointer p-3 sm:p-3.5 rounded-2xl bg-[#141414] border ${isSelected ? 'border-[#D4AF37] bg-[#1a1810] shadow-[0_0_25px_rgba(212,175,55,0.25)]' : 'border-[#D4AF37]/20 hover:border-[#D4AF37]/50'} transition-all text-right group flex gap-3.5 items-center"
        >
          <!-- Branch Visual Illustration / Photo Thumbnail -->
          <div class="w-20 h-20 sm:w-22 sm:h-22 rounded-xl overflow-hidden shrink-0 border border-[#D4AF37]/35 bg-black relative shadow-md">
            <img 
              src="${b.image}" 
              alt="${b.name}" 
              loading="lazy"
              class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
              onerror="this.src='./hero_oriental_pastry_atelier_1790628925750.jpg'"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
            <span class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-[9px] text-[#fae084] font-bold border border-[#D4AF37]/30">
              ⭐ ${b.rating}
            </span>
          </div>

          <!-- Branch Details -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between mb-1 gap-1">
              <span class="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] font-bold border border-[#D4AF37]/30 truncate">
                ${b.area}
              </span>
              <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/30 flex items-center gap-1 shrink-0">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                مفتوح
              </span>
            </div>

            <h4 class="text-xs sm:text-sm font-black text-[#F3E5AB] group-hover:text-[#D4AF37] transition-colors mb-1 font-serif-arabic truncate">
              ${b.name}
            </h4>

            <p class="text-[10px] sm:text-[11px] text-[#F3E5AB]/70 mb-2 font-light leading-relaxed line-clamp-1">
              ${b.address}
            </p>

            ${distance !== undefined ? `
              <div class="mb-2 py-0.5 px-2 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[10px] text-[#fae084] font-bold flex items-center justify-between">
                <div class="flex items-center gap-1">
                  <i class="fas fa-location-arrow text-[#D4AF37]"></i>
                  <span>يبعد عن موقعك:</span>
                </div>
                <span class="font-mono text-white text-[11px]">${distance} كم</span>
              </div>
            ` : ''}

            <div class="flex items-center justify-between text-[11px] text-[#D4AF37] pt-1.5 border-t border-[#D4AF37]/15">
              <span class="text-[9px] sm:text-[10px] text-neutral-300 font-light truncate max-w-[130px]"><i class="far fa-clock ml-1 text-[#D4AF37]"></i>${b.hours}</span>
              <div class="flex items-center gap-1.5 shrink-0">
                <a href="tel:${b.phone}" onclick="event.stopPropagation()" class="p-1 px-2 rounded-lg bg-black/50 hover:bg-[#D4AF37] hover:text-black border border-[#D4AF37]/25 transition-all flex items-center gap-1 text-[10px]" title="اتصال">
                  <i class="fas fa-phone-alt text-[9px]"></i>
                  <span class="font-bold">اتصال</span>
                </a>
                <a href="${b.directionsUrl}" target="_blank" onclick="event.stopPropagation()" class="p-1 px-2 rounded-lg bg-[#D4AF37] hover:bg-[#C5A059] text-black font-black text-[10px] transition-all flex items-center gap-1 shadow-sm">
                  <span>الاتجاهات</span>
                  <i class="fas fa-location-arrow text-[8px]"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  selectBranch(id) {
    AppState.activeBranchId = id;
    this.renderBranchesList();
    const branch = branchesData.find(b => b.id === id);
    if (!branch) return;

    this.updateActiveBranchDisplay(branch);

    if (this.viewMode === 'art') {
      this.renderArtPins();
    } else if (window.alaseelMap) {
      const targetLat = branch.lat + 0.0035;
      window.alaseelMap.flyTo([targetLat, branch.lng], 15.5, { duration: 1.1 });
      setTimeout(() => {
        if (window.branchMarkers && window.branchMarkers[id]) {
          window.branchMarkers[id].openPopup();
        }
      }, 400);
    }
  },

  renderMap() {
    const mapEl = document.getElementById('leaflet-map');
    if (!mapEl || typeof L === 'undefined') return;

    if (window.alaseelMap) {
      window.alaseelMap.remove();
    }

    mapEl.classList.add('dark-map-tiles');

    const map = L.map('leaflet-map', {
      center: [26.5650, 31.6990],
      zoom: 13.5,
      scrollWheelZoom: false
    });
    window.alaseelMap = map;
    window.branchMarkers = {};

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    const createGoldIcon = (branch) => {
      return L.divIcon({
        className: 'custom-gold-marker-container',
        html: `
          <div class="custom-gold-marker" title="${branch.name}">
            <div class="marker-pulse"></div>
            <div class="marker-pin">
              <i class="fas fa-crown"></i>
            </div>
          </div>
        `,
        iconSize: [40, 40],
        iconAnchor: [20, 36],
        popupAnchor: [0, -28]
      });
    };

    branchesData.forEach(branch => {
      const marker = L.marker([branch.lat, branch.lng], { icon: createGoldIcon(branch) }).addTo(map);
      
      const popupHtml = `
        <div style="direction: rtl; text-align: right; font-family: 'Cairo', sans-serif; width: 240px; padding: 12px; background: #141414; border-radius: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-size: 10px; font-weight: bold; color: #D4AF37; background: rgba(212,175,55,0.15); border: 1px solid rgba(212,175,55,0.3); padding: 1px 7px; border-radius: 9999px;">
              ${branch.area}
            </span>
            <span style="font-size: 10px; color: #34d399; font-weight: bold;">
              🟢 مفتوح الآن
            </span>
          </div>
          <h4 style="font-weight: 900; color: #fae084; margin: 0 0 4px 0; font-size: 13px; line-height: 1.3;">${branch.name}</h4>
          <p style="font-size: 11px; color: #c9bea9; margin: 0 0 6px 0; line-height: 1.4;">${branch.address}</p>
          <div style="font-size: 10px; color: #D4AF37; margin-bottom: 10px;">
            <i class="far fa-clock"></i> ${branch.hours}
          </div>
          <div style="display: flex; gap: 6px;">
            <a href="tel:${branch.phone}" style="flex: 1; padding: 6px 0; border-radius: 10px; background: #222; color: #D4AF37; font-size: 11px; font-weight: bold; text-decoration: none; text-align: center; border: 1px solid rgba(212,175,55,0.3);">
              📞 اتصال
            </a>
            <a href="${branch.directionsUrl}" target="_blank" style="flex: 1.3; padding: 6px 0; border-radius: 10px; background: #D4AF37; color: #000; font-size: 11px; font-weight: 900; text-decoration: none; text-align: center;">
              📍 الاتجاهات
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { 
        maxWidth: 280, 
        closeButton: false,
        autoPan: true,
        autoPanPadding: [25, 25]
      });

      marker.on('click', () => {
        AppState.activeBranchId = branch.id;
        BranchesManager.renderBranchesList();
      });

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

// --- 11. Interactive Developer Profile Modal Manager ---
const DeveloperModalManager = {
  openModal() {
    const modal = document.getElementById('developer-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.body.style.overflow = 'hidden';
  },

  closeModal() {
    const modal = document.getElementById('developer-modal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.body.style.overflow = '';
  }
};

// Close modal when clicking on the backdrop
document.addEventListener('click', (e) => {
  const modal = document.getElementById('developer-modal');
  if (modal && e.target === modal) {
    DeveloperModalManager.closeModal();
  }
});

// --- 12. Prestige Welcome Splash Screen Manager ---
const SplashScreenManager = {
  init() {
    const splash = document.getElementById('welcome-splash');
    const bar = document.getElementById('splash-progress-bar');
    const perc = document.getElementById('splash-percentage');
    const text = document.getElementById('splash-step-text');
    const skipBtn = document.getElementById('splash-skip-btn');

    if (!splash) return;

    const steps = [
      'انتقاء أجود خامات السمن البلدي الفلاحي الصافي...',
      'تجهيز منيو الحلويات الشرقية وتورتات المناسبات...',
      'ربط فروع سوهاج الخمسة والخرائط التفاعلية...',
      'مرحباً بكم في رحاب حلواني الأصيل بسوهاج ⚜️'
    ];

    let progress = 12;
    const interval = setInterval(() => {
      const increment = Math.floor(Math.random() * 8) + 12;
      progress = Math.min(100, progress + increment);

      if (bar) bar.style.width = `${progress}%`;
      if (perc) perc.textContent = `${progress}%`;

      if (text) {
        if (progress >= 85) text.textContent = steps[3];
        else if (progress >= 55) text.textContent = steps[2];
        else if (progress >= 25) text.textContent = steps[1];
      }

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => this.dismiss(), 400);
      }
    }, 120);

    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        clearInterval(interval);
        this.dismiss();
      });
    }
  },

  dismiss() {
    const splash = document.getElementById('welcome-splash');
    if (!splash) return;
    splash.classList.add('opacity-0', 'scale-105', 'pointer-events-none');
    setTimeout(() => {
      splash.style.display = 'none';
    }, 600);
  }
};

// --- 13. Dynamic Golden Flux Lines Canvas Background ---
const FluxLinesManager = {
  init() {
    const canvas = document.getElementById('flux-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    // Waves configuration for flux lines
    const lineCount = 18;
    let step = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      step += 0.012;

      for (let i = 0; i < lineCount; i++) {
        ctx.beginPath();
        const baseOpacity = 0.04 + (i / lineCount) * 0.12;
        ctx.strokeStyle = `rgba(212, 175, 55, ${baseOpacity})`;
        ctx.lineWidth = 1 + (i % 3 === 0 ? 0.8 : 0.3);

        const yOffset = (height / lineCount) * i;
        const waveSpeed = step + i * 0.25;

        for (let x = 0; x <= width; x += 15) {
          const sin1 = Math.sin(x * 0.003 + waveSpeed) * 35;
          const cos1 = Math.cos(x * 0.002 - waveSpeed * 0.5) * 25;
          const y = yOffset + sin1 + cos1;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      requestAnimationFrame(render);
    };

    render();
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
  SplashScreenManager.init();
  FluxLinesManager.init();

  // Wire developer link in navbar/footer to open the interactive modal
  const devLinks = document.querySelectorAll('a[href="#developer"]');
  devLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      DeveloperModalManager.openModal();
    });
  });

  // Initialize Lucide icons if available
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

