import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, MapPin, Clock, Phone, Mail, Search, Target, Truck, Zap, Shield, Globe, ChevronRight, X, Menu, Send, CheckCircle, AlertCircle } from 'lucide-react'

// Universal Web3Forms Handler Hook
const useFormHandler = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const handleSubmit = async (e, accessKey) => {
    e.preventDefault();
    setIsSubmitting(true);
    setIsError(false);
    
    const formData = new FormData(e.target);
    formData.append('access_key', accessKey);
    
    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsSuccess(true);
        e.target.reset();
      } else {
        setIsError(true);
        setErrorMessage(data.message || 'Что-то пошло не так');
      }
    } catch (error) {
      setIsError(true);
      setErrorMessage('Ошибка сети. Попробуйте снова.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const resetForm = () => {
    setIsSuccess(false);
    setIsError(false);
    setErrorMessage('');
  };
  
  return { isSubmitting, isSuccess, isError, errorMessage, handleSubmit, resetForm };
};

function App() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOffice, setSelectedOffice] = useState(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [routeMode, setRouteMode] = useState(false)
  const [searchError, setSearchError] = useState('')
  const mapRef = useRef(null)
  const ymapsRef = useRef(null)

  const offices = [
    {
      id: 1,
      city: 'Париж',
      address: 'Champs-Élysées, 75008 Paris, France',
      coords: [48.8698, 2.3078],
      phone: '+33 1 23 45 67 89',
      email: 'paris@expressdelivery.com',
      hours: 'Пн-Пт: 08:00 - 20:00, Сб-Вс: 09:00 - 18:00'
    },
    {
      id: 2,
      city: 'Лондон',
      address: 'Oxford Street, London W1D 1BS, UK',
      coords: [51.5155, -0.1415],
      phone: '+44 20 7123 4567',
      email: 'london@expressdelivery.com',
      hours: 'Пн-Пт: 08:00 - 20:00, Сб-Вс: 09:00 - 18:00'
    }
  ]

  useEffect(() => {
    if (typeof window.ymaps !== 'undefined') {
      window.ymaps.ready(() => {
        const map = new window.ymaps.Map('map', {
          center: [50.0, 0.5],
          zoom: 5,
          controls: ['zoomControl', 'fullscreenControl']
        })

        ymapsRef.current = window.ymaps
        mapRef.current = map

        offices.forEach(office => {
          const placemark = new window.ymaps.Placemark(
            office.coords,
            {
              balloonContentHeader: `<strong class="text-lg">${office.city}</strong>`,
              balloonContentBody: `
                <div class="p-2">
                  <p class="mb-2"><strong>Адрес:</strong> ${office.address}</p>
                  <p class="mb-2"><strong>Телефон:</strong> ${office.phone}</p>
                  <p class="mb-2"><strong>Email:</strong> ${office.email}</p>
                  <p><strong>Часы работы:</strong> ${office.hours}</p>
                </div>
              `,
              hintContent: office.city
            },
            {
              preset: 'islands#redDeliveryIcon',
              iconColor: '#ef4444'
            }
          )

          placemark.events.add('click', () => {
            setSelectedOffice(office)
          })

          map.geoObjects.add(placemark)
        })
      })
    }
  }, [])

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchError('Введите адрес для поиска')
      return
    }

    if (ymapsRef.current && mapRef.current) {
      setSearchError('')
      
      ymapsRef.current.geocode(searchQuery, {
        results: 1
      }).then(result => {
        const firstGeoObject = result.geoObjects.get(0)
        if (firstGeoObject) {
          const coords = firstGeoObject.geometry.getCoordinates()
          const bounds = firstGeoObject.properties.get('boundedBy')
          
          mapRef.current.setBounds(bounds, {
            checkZoomRange: true,
            duration: 500
          }).then(() => {
            // Add temporary marker for searched location
            const searchMarker = new ymapsRef.current.Placemark(
              coords,
              {
                balloonContent: `<strong>${searchQuery}</strong>`
              },
              {
                preset: 'islands#greenCircleDotIcon'
              }
            )
            
            // Remove previous search markers
            mapRef.current.geoObjects.each(obj => {
              if (obj.properties && obj.properties.get('type') === 'search') {
                mapRef.current.geoObjects.remove(obj)
              }
            })
            
            searchMarker.properties.set('type', 'search')
            mapRef.current.geoObjects.add(searchMarker)
          })
          
          setSearchError('')
        } else {
          setSearchError('Адрес не найден. Попробуйте другой запрос.')
        }
      }).catch(error => {
        console.error('Geocoding error:', error)
        setSearchError('Ошибка поиска. Попробуйте снова.')
      })
    }
  }

  const buildRoute = (office) => {
    if (!searchQuery.trim()) {
      setSearchError('Введите адрес отправления для построения маршрута')
      return
    }

    if (ymapsRef.current && mapRef.current) {
      setSearchError('')
      
      ymapsRef.current.geocode(searchQuery).then(result => {
        const firstGeoObject = result.geoObjects.get(0)
        if (firstGeoObject) {
          const startCoords = firstGeoObject.geometry.getCoordinates()
          
          const multiRoute = new ymapsRef.current.multiRouter.MultiRoute({
            referencePoints: [startCoords, office.coords],
            params: {
              routingMode: 'auto'
            }
          }, {
            boundsAutoApply: true,
            wayPointStartIconColor: '#4ade80',
            wayPointFinishIconColor: '#ef4444',
            routeActiveStrokeColor: '#ef4444',
            routeActiveStrokeWidth: 6
          })

          mapRef.current.geoObjects.removeAll()
          mapRef.current.geoObjects.add(multiRoute)
          
          offices.forEach(off => {
            const placemark = new ymapsRef.current.Placemark(
              off.coords,
              {
                hintContent: off.city
              },
              {
                preset: 'islands#redDeliveryIcon',
                iconColor: '#ef4444'
              }
            )
            mapRef.current.geoObjects.add(placemark)
          })

          setRouteMode(true)
        } else {
          setSearchError('Адрес не найден. Проверьте правильность ввода.')
        }
      }).catch(error => {
        console.error('Route error:', error)
        setSearchError('Ошибка построения маршрута. Попробуйте снова.')
      })
    }
  }

  const resetMap = () => {
    if (mapRef.current && ymapsRef.current) {
      mapRef.current.geoObjects.removeAll()
      
      offices.forEach(office => {
        const placemark = new ymapsRef.current.Placemark(
          office.coords,
          {
            balloonContentHeader: `<strong class="text-lg">${office.city}</strong>`,
            balloonContentBody: `
              <div class="p-2">
                <p class="mb-2"><strong>Адрес:</strong> ${office.address}</p>
                <p class="mb-2"><strong>Телефон:</strong> ${office.phone}</p>
                <p class="mb-2"><strong>Email:</strong> ${office.email}</p>
                <p><strong>Часы работы:</strong> ${office.hours}</p>
              </div>
            `,
            hintContent: office.city
          },
          {
            preset: 'islands#redDeliveryIcon',
            iconColor: '#ef4444'
          }
        )

        placemark.events.add('click', () => {
          setSelectedOffice(office)
        })

        mapRef.current.geoObjects.add(placemark)
      })

      mapRef.current.setCenter([50.0, 0.5], 5)
      setRouteMode(false)
      setSearchError('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      {/* HEADER */}
      <header className="fixed top-0 w-full bg-white/95 backdrop-blur-lg z-50 border-b border-red-100 shadow-lg">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-red-500 to-orange-500 p-2 rounded-xl shadow-lg">
                <Package className="w-8 h-8 text-white" />
              </div>
              <div>
                <span className="text-2xl font-black text-gray-900 block leading-none">Express</span>
                <span className="text-xs font-bold text-red-600 uppercase tracking-wider">Delivery</span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-8">
              <a href="#services" className="text-gray-700 hover:text-red-600 font-semibold transition-colors">Услуги</a>
              <a href="#offices" className="text-gray-700 hover:text-red-600 font-semibold transition-colors">Офисы</a>
              <a href="#contact" className="text-gray-700 hover:text-red-600 font-semibold transition-colors">Контакты</a>
            </div>

            <div className="flex items-center gap-4">
              <button className="hidden md:block bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg shadow-red-500/30">
                Заказать доставку
              </button>
              <button 
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 hover:bg-red-50 rounded-lg transition-colors"
              >
                {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>

          {/* Mobile Menu */}
          <AnimatePresence>
            {showMobileMenu && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="md:hidden mt-4 pb-4 border-t border-red-100 pt-4"
              >
                <div className="flex flex-col space-y-3">
                  <a href="#services" className="text-gray-700 hover:text-red-600 font-semibold transition-colors py-2">Услуги</a>
                  <a href="#offices" className="text-gray-700 hover:text-red-600 font-semibold transition-colors py-2">Офисы</a>
                  <a href="#contact" className="text-gray-700 hover:text-red-600 font-semibold transition-colors py-2">Контакты</a>
                  <button className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-6 py-3 rounded-xl font-bold">
                    Заказать доставку
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </nav>
      </header>

      {/* HERO with Map */}
      <section className="pt-24 pb-8 px-6">
        <div className="container mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-8"
          >
            <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-4 tracking-tight">
              Быстрая доставка
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600">
                по всей Европе
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-6 max-w-3xl mx-auto font-medium">
              Наши офисы в Париже и Лондоне обеспечивают надежную доставку 24/7
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-3xl mx-auto mb-8"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-red-100 p-2">
              <div className="flex gap-2">
                <div className="flex-1 flex items-center gap-3 bg-gray-50 rounded-xl px-4">
                  <Search className="w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Введите адрес для поиска или построения маршрута..."
                    className="flex-1 bg-transparent py-4 text-gray-900 placeholder-gray-400 focus:outline-none font-medium"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-8 py-4 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg shadow-red-500/30 flex items-center gap-2"
                >
                  <Target className="w-5 h-5" />
                  Найти
                </button>
              </div>
              {searchError && (
                <div className="mt-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-red-600 font-medium">{searchError}</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Map Container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="relative"
          >
            <div className="bg-white rounded-3xl shadow-2xl border-4 border-red-100 overflow-hidden">
              <div id="map" style={{ height: '600px' }} className="w-full"></div>
            </div>

            {/* Route Controls */}
            {searchQuery && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="absolute top-4 left-4 bg-white rounded-xl shadow-xl border border-red-100 p-4"
              >
                <p className="text-sm font-bold text-gray-700 mb-3">Построить маршрут до:</p>
                <div className="flex flex-col gap-2">
                  {offices.map(office => (
                    <button
                      key={office.id}
                      onClick={() => buildRoute(office)}
                      className="bg-gradient-to-r from-red-50 to-orange-50 hover:from-red-100 hover:to-orange-100 text-gray-900 px-4 py-2 rounded-lg font-semibold transition-all text-left flex items-center gap-2"
                    >
                      <MapPin className="w-4 h-4 text-red-600" />
                      {office.city}
                    </button>
                  ))}
                </div>
                {routeMode && (
                  <button
                    onClick={resetMap}
                    className="mt-3 w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-semibold transition-all"
                  >
                    Сбросить маршрут
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Office Info Modal */}
      <AnimatePresence>
        {selectedOffice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            onClick={() => setSelectedOffice(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 border-4 border-red-100"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-3xl font-black text-gray-900">{selectedOffice.city}</h3>
                <button
                  onClick={() => setSelectedOffice(null)}
                  className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl">
                  <MapPin className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900 mb-1">Адрес</p>
                    <p className="text-gray-700">{selectedOffice.address}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl">
                  <Phone className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900 mb-1">Телефон</p>
                    <p className="text-gray-700">{selectedOffice.phone}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl">
                  <Mail className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900 mb-1">Email</p>
                    <p className="text-gray-700">{selectedOffice.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl">
                  <Clock className="w-5 h-5 text-red-600 mt-1 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-gray-900 mb-1">Часы работы</p>
                    <p className="text-gray-700">{selectedOffice.hours}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => buildRoute(selectedOffice)}
                className="mt-6 w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white px-6 py-4 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
              >
                <Target className="w-5 h-5" />
                Построить маршрут
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Features */}
      <section id="services" className="py-20 px-6 bg-white">
        <div className="container mx-auto">
          <h2 className="text-5xl md:text-6xl font-black text-gray-900 text-center mb-4">
            Почему выбирают нас?
          </h2>
          <p className="text-xl text-gray-600 text-center mb-16 max-w-2xl mx-auto">
            Надежность, скорость и качество в каждой доставке
          </p>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-8 rounded-2xl border-2 border-red-100 hover:border-red-300 transition-all transform hover:scale-105 hover:shadow-2xl"
            >
              <div className="bg-gradient-to-br from-red-500 to-orange-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-500/30">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4">Молниеносная доставка</h3>
              <p className="text-gray-700 leading-relaxed font-medium">
                Экспресс-доставка в любую точку Европы за 24-48 часов с гарантией сохранности груза
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-8 rounded-2xl border-2 border-red-100 hover:border-red-300 transition-all transform hover:scale-105 hover:shadow-2xl"
            >
              <div className="bg-gradient-to-br from-red-500 to-orange-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-500/30">
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4">100% безопасность</h3>
              <p className="text-gray-700 leading-relaxed font-medium">
                Полное страхование грузов и отслеживание в реальном времени на каждом этапе
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50 p-8 rounded-2xl border-2 border-red-100 hover:border-red-300 transition-all transform hover:scale-105 hover:shadow-2xl"
            >
              <div className="bg-gradient-to-br from-red-500 to-orange-500 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-red-500/30">
                <Globe className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-black text-gray-900 mb-4">Европейская сеть</h3>
              <p className="text-gray-700 leading-relaxed font-medium">
                Офисы в ключевых городах Европы обеспечивают быструю обработку заказов
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section id="contact" className="py-20 px-6 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
        <div className="container mx-auto max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-4">
              Свяжитесь с нами
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Есть вопросы? Оставьте заявку и мы свяжемся с вами в ближайшее время
            </p>
          </motion.div>

          <ContactForm />
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-red-600 via-orange-600 to-red-700">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6">
              Готовы начать?
            </h2>
            <p className="text-xl md:text-2xl text-red-100 mb-10 max-w-2xl mx-auto font-medium">
              Закажите доставку прямо сейчас и получите скидку 15% на первый заказ!
            </p>
            <button className="bg-white hover:bg-gray-100 text-red-600 px-12 py-5 rounded-2xl text-xl font-black transition-all transform hover:scale-105 shadow-2xl flex items-center gap-3 mx-auto">
              <Truck className="w-6 h-6" />
              Заказать доставку
              <ChevronRight className="w-6 h-6" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12 px-6">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-gradient-to-br from-red-500 to-orange-500 p-2 rounded-xl">
                  <Package className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-black text-white">Express Delivery</span>
              </div>
              <p className="text-gray-400 font-medium">
                Надежная служба доставки по всей Европе с офисами в Париже и Лондоне
              </p>
            </div>

            <div>
              <h4 className="text-white font-black text-lg mb-4">Париж</h4>
              <div className="space-y-2 text-gray-400 font-medium">
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  Champs-Élysées, 75008
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-red-500" />
                  +33 1 23 45 67 89
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-white font-black text-lg mb-4">Лондон</h4>
              <div className="space-y-2 text-gray-400 font-medium">
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-red-500" />
                  Oxford Street, W1D 1BS
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-red-500" />
                  +44 20 7123 4567
                </p>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-gray-500 font-medium">
            © 2024 Express Delivery. Все права защищены.
          </div>
        </div>
      </footer>
    </div>
  )
}

// Contact Form Component
const ContactForm = () => {
  const { isSubmitting, isSuccess, isError, errorMessage, handleSubmit, resetForm } = useFormHandler();
  const ACCESS_KEY = 'YOUR_WEB3FORMS_ACCESS_KEY'; // Replace with your Web3Forms Access Key from https://web3forms.com

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="bg-white rounded-3xl shadow-2xl border-4 border-red-100 p-8 md:p-12"
    >
      <AnimatePresence mode="wait">
        {!isSuccess ? (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            onSubmit={(e) => handleSubmit(e, ACCESS_KEY)}
            className="space-y-6"
          >
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Ваше имя
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Иван Иванов"
                  required
                  className="w-full px-4 py-3 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-100 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors font-medium"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="ivan@example.com"
                  required
                  className="w-full px-4 py-3 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-100 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Телефон
              </label>
              <input
                type="tel"
                name="phone"
                placeholder="+7 (999) 123-45-67"
                className="w-full px-4 py-3 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-100 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Сообщение
              </label>
              <textarea
                name="message"
                placeholder="Расскажите о вашем запросе..."
                rows="5"
                required
                className="w-full px-4 py-3 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-100 rounded-xl text-gray-900 placeholder-gray-500 focus:outline-none focus:border-red-500 transition-colors resize-none font-medium"
              ></textarea>
            </div>

            {isError && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-600 font-semibold">{errorMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed text-white px-8 py-4 rounded-xl font-bold transition-all transform hover:scale-105 disabled:transform-none shadow-lg shadow-red-500/30 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Отправка...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Отправить сообщение
                </>
              )}
            </button>
          </motion.form>
        ) : (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4, type: "spring" }}
            className="text-center py-12"
          >
            <div className="bg-green-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h3 className="text-3xl font-black text-gray-900 mb-4">
              Сообщение отправлено!
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto font-medium">
              Спасибо за обращение. Мы свяжемся с вами в ближайшее время.
            </p>
            <button
              onClick={resetForm}
              className="text-red-600 hover:text-red-700 font-bold transition-colors"
            >
              Отправить еще одно сообщение
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default App