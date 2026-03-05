
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, Star, ChevronLeft, ChevronRight, Music, Mic2, Heart, Laptop, Zap, ArrowRight, Camera, ShoppingBag, Sparkles } from 'lucide-react';
import { eventService, Event } from '@/services/eventService';
import MainLayout from '@/components/layout/MainLayout';

const Index = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredEvents, setFeaturedEvents] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Static branding banners (Always present)
  const brandingBanners = [
    {
      id: 'branding-1',
      title: 'ORGANIZE SEU EVENTO COM ELITE',
      subtitle: 'A melhor plataforma de gestão para produtores do Brasil',
      description: 'Taxas competitivas, gestão completa de staff e fornecedores, e checkout ultra-rápido para seus clientes.',
      cta: 'Começar Agora',
      link: '/auth/register',
      imageUrl: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?q=80&w=2070&auto=format&fit=crop',
      badge: 'Solução Completa'
    },
    {
      id: 'branding-2',
      title: 'O BANCO DE TALENTOS QUE VOCÊ PRECISA',
      subtitle: 'Encontre profissionais qualificados para o seu backstage',
      description: 'Milhares de profissionais de staff, som, iluminação e segurança prontos para fazer seu evento brilhar.',
      cta: 'Ver Banco de Talentos',
      link: '/work-with-us',
      imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop',
      badge: 'Para Profissionais'
    }
  ];

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [featured, all] = await Promise.all([
          eventService.getFeaturedEvents(),
          eventService.getPublicEvents()
        ]);
        setFeaturedEvents(featured);
        setAllEvents(all);
      } catch (error) {
        console.error('Erro ao listar eventos:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Combine branding + featured
  const allBanners = [
    ...brandingBanners,
    ...featuredEvents.map(event => ({
      id: event.id,
      title: event.title.toUpperCase(),
      subtitle: `${new Date(event.date).toLocaleDateString('pt-BR')} • ${event.location.city}`,
      description: event.description?.substring(0, 150) + '...',
      cta: 'Garantir Ingresso',
      link: `/events/${event.id}`,
      imageUrl: event.bannerUrl || 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1200',
      badge: 'Evento em Destaque'
    }))
  ];

  useEffect(() => {
    if (allBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % allBanners.length);
    }, 8000);
    return () => clearInterval(timer);
  }, [allBanners.length]);

  return (
    <MainLayout>
      <div className="pb-20 bg-gray-50">
        {/* Hero Section - Rotating Banner */}
        <section className="relative h-[650px] overflow-hidden bg-gray-950">
          <div
            className="flex h-full transition-transform duration-1000 cubic-bezier(0.4, 0, 0.2, 1)"
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {allBanners.map((banner) => (
              <div key={banner.id} className="min-w-full h-full relative">
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="w-full h-full object-cover brightness-[0.2] scale-105"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white px-4 max-w-5xl">
                    <div className="inline-flex items-center gap-2 bg-indigo-600/90 backdrop-blur-sm text-[10px] md:text-xs uppercase font-black tracking-widest px-4 py-1.5 rounded-full mb-6 animate-fade-in shadow-xl">
                      <Zap className="w-3 h-3 fill-current text-yellow-300" /> {banner.badge}
                    </div>
                    <div className="text-lg md:text-2xl font-bold mb-2 text-indigo-400 uppercase tracking-tighter opacity-90">
                      {banner.subtitle}
                    </div>
                    <h1 className="text-4xl md:text-7xl font-black mb-6 tracking-tighter leading-tight drop-shadow-2xl uppercase">
                      {banner.title}
                    </h1>
                    <p className="text-lg md:text-xl mb-8 text-gray-300 font-medium max-w-2xl mx-auto leading-relaxed opacity-90">
                      {banner.description}
                    </p>
                    <div className="flex flex-col md:flex-row gap-4 justify-center">
                      <Link to={banner.link} className="bg-white text-gray-900 px-8 py-3 rounded-[2rem] font-black text-lg hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-2xl hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                        {banner.cta} <ChevronRight className="w-5 h-5" />
                      </Link>
                      <Link to="/events" className="bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white border border-white/30 px-8 py-3 rounded-[2rem] font-black text-lg transition-all duration-300 flex items-center justify-center">
                        Explorar Eventos
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Banner Navigation Buttons */}
          <button
            onClick={() => setCurrentSlide((prev) => (prev - 1 + allBanners.length) % allBanners.length)}
            className="absolute left-8 top-1/2 -translate-y-1/2 p-5 rounded-[1.5rem] bg-black/30 hover:bg-indigo-600 text-white backdrop-blur-md transition-all z-20 group"
          >
            <ChevronLeft className="w-8 h-8 group-hover:-translate-x-1 transition" />
          </button>
          <button
            onClick={() => setCurrentSlide((prev) => (prev + 1) % allBanners.length)}
            className="absolute right-8 top-1/2 -translate-y-1/2 p-5 rounded-[1.5rem] bg-black/30 hover:bg-indigo-600 text-white backdrop-blur-md transition-all z-20 group"
          >
            <ChevronRight className="w-8 h-8 group-hover:translate-x-1 transition" />
          </button>

          {/* Carousel Indicators */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-4 z-20">
            {allBanners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentSlide(idx)}
                className={`h-2 transition-all duration-500 rounded-full ${currentSlide === idx ? 'w-12 bg-white' : 'w-2 bg-white/40 hover:bg-white/60'}`}
              />
            ))}
          </div>
        </section>

        {/* Categories Bar */}
        <section className="max-w-7xl mx-auto px-4 -mt-16 relative z-30">
          <div className="bg-white rounded-[3rem] shadow-2xl p-8 grid grid-cols-2 lg:grid-cols-4 gap-8 border border-gray-100">
            {[
              { label: 'Música', icon: Music, color: 'text-pink-600', bg: 'bg-pink-50', id: 'Música' },
              { label: 'Educação', icon: Laptop, color: 'text-blue-600', bg: 'bg-blue-50', id: 'Educação' },
              { label: 'Humor', icon: Mic2, color: 'text-orange-600', bg: 'bg-orange-50', id: 'Humor' },
              { label: 'Festivais', icon: Heart, color: 'text-red-600', bg: 'bg-red-50', id: 'Festivais' },
            ].map((cat, i) => (
              <Link
                key={i}
                to={`/events?category=${cat.id}`}
                className="flex flex-col items-center gap-3 cursor-pointer group"
              >
                <div className={`w-16 h-16 ${cat.bg} rounded-[1.5rem] flex items-center justify-center ${cat.color} group-hover:scale-110 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 shadow-sm`}>
                  <cat.icon className="w-8 h-8" />
                </div>
                <span className="font-black text-gray-800 text-sm tracking-tighter uppercase">{cat.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Recent Events Section */}
        <section className="max-w-7xl mx-auto px-4 py-20">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <div className="inline-block bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4">Em Alta</div>
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase">Estreias e Destaques</h2>
            </div>
            <Link to="/events" className="flex items-center gap-2 text-indigo-600 font-black text-lg hover:gap-4 transition-all group">
              Explorar Todos <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {allEvents.length === 0 ? (
              <div className="col-span-full py-20 text-center border-2 border-dashed border-gray-100 rounded-[3rem]">
                <Sparkles className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Nenhum evento disponível no momento</p>
              </div>
            ) : (
              allEvents.slice(0, 8).map(event => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl border border-gray-100 transition-all duration-500 flex flex-col h-full hover:-translate-y-2"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={event.bannerUrl || event.imageUrl}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-95"
                    />
                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-4 py-1.5 rounded-full text-[10px] font-black text-indigo-600 shadow-lg uppercase tracking-widest">
                      {event.category?.toUpperCase() || 'EVENTO'}
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-2 text-[10px] text-orange-500 font-black mb-3 uppercase tracking-tighter">
                      <Star className="w-3 h-3 fill-current" />
                      <span>Verificado</span>
                    </div>
                    <h3 className="font-black text-lg text-gray-900 mb-4 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{event.title}</h3>

                    <div className="space-y-2 mt-auto mb-6">
                      <div className="flex items-center gap-3 text-gray-400 font-bold text-xs uppercase tracking-tight">
                        <div className="p-1.5 bg-gray-50 rounded-lg"><Calendar className="w-4 h-4 text-indigo-500" /></div>
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-400 font-bold text-xs uppercase tracking-tight">
                        <div className="p-1.5 bg-gray-50 rounded-lg"><MapPin className="w-4 h-4 text-indigo-500" /></div>
                        <span className="line-clamp-1">{event.location?.city || 'Brasil'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-0.5">A partir de</span>
                        <span className="text-2xl font-black text-indigo-600 tracking-tighter">
                          R$ {event.tickets && event.tickets[0] ? event.tickets[0].price.toFixed(2) : '0,00'}
                        </span>
                      </div>
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-inner group-hover:shadow-lg group-hover:shadow-indigo-200">
                        <ChevronRight className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* Events Grid by Category */}
        {[
          { title: 'Shows e Música', id: 'Música' },
          { title: 'Workshops e Cursos', id: 'Educação' },
          { title: 'Teatro e Stand-up', id: 'Humor' }
        ].map((cat) => (
          <section key={cat.id} className="max-w-7xl mx-auto px-4 py-20">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
              <div>
                <div className="inline-block bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4">Explorar</div>
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 tracking-tighter uppercase">{cat.title}</h2>
              </div>
              <Link to="/events" className="flex items-center gap-2 text-indigo-600 font-black text-lg hover:gap-4 transition-all group">
                Ver todos <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
              {allEvents.filter(e => e.category === cat.id).slice(0, 4).map(event => (
                <Link
                  key={event.id}
                  to={`/events/${event.id}`}
                  className="group bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl border border-gray-100 transition-all duration-500 flex flex-col h-full hover:-translate-y-2"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={event.bannerUrl}
                      alt={event.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-95"
                    />
                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur px-4 py-1.5 rounded-full text-[10px] font-black text-indigo-600 shadow-lg uppercase tracking-widest">
                      {event.category.toUpperCase()}
                    </div>
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <div className="flex items-center gap-2 text-[10px] text-orange-500 font-black mb-3 uppercase tracking-tighter">
                      <Star className="w-3 h-3 fill-current" />
                      <span>Verificado</span>
                    </div>
                    <h3 className="font-black text-lg text-gray-900 mb-4 line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{event.title}</h3>

                    <div className="space-y-2 mt-auto mb-6">
                      <div className="flex items-center gap-3 text-gray-400 font-bold text-xs uppercase tracking-tight">
                        <div className="p-1.5 bg-gray-50 rounded-lg"><Calendar className="w-4 h-4 text-indigo-500" /></div>
                        <span>{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-3 text-gray-400 font-bold text-xs uppercase tracking-tight">
                        <div className="p-1.5 bg-gray-50 rounded-lg"><MapPin className="w-4 h-4 text-indigo-500" /></div>
                        <span className="line-clamp-1">{event.location.city}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-gray-50 pt-4">
                      <div className="flex flex-col">
                        <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-0.5">A partir de</span>
                        <span className="text-2xl font-black text-indigo-600 tracking-tighter">R$ {event.tickets[0]?.price.toFixed(2)}</span>
                      </div>
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-inner group-hover:shadow-lg group-hover:shadow-indigo-200">
                        <ChevronRight className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* Work With Us Banner (New Phase 5) */}
        <section className="max-w-7xl mx-auto px-4 mb-20">
          <div className="relative rounded-[2.5rem] overflow-hidden shadow-2xl group cursor-pointer h-[400px]">
            <img
              src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              alt="Backstage"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent"></div>

            <div className="absolute inset-0 flex flex-col md:flex-row items-center justify-between p-12 md:p-20 text-white w-full">
              <div className="max-w-2xl text-left">
                <div className="inline-flex items-center gap-2 bg-yellow-500 text-black px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-6 w-fit animate-pulse">
                  <Star className="w-3 h-3 fill-current" /> Oportunidade
                </div>
                <h2 className="text-3xl md:text-5xl font-black mb-4 leading-tight tracking-tighter uppercase">
                  FAÇA PARTE
                </h2>
                <div className="flex items-center gap-4 mb-8 text-left">
                  <span className="text-white text-xl md:text-3xl font-black uppercase tracking-tighter">DO</span>
                  <span className="text-yellow-500 text-5xl md:text-8xl italic font-black tracking-[0.1em] drop-shadow-[0_2px_15px_rgba(234,179,8,0.6)]">SHOW</span>
                </div>
                <p className="text-lg md:text-xl text-gray-300 font-medium mb-0 leading-relaxed">
                  Produtores de todo o Brasil buscam talentos como você. Cadastre-se no banco de talentos e trabalhe nos melhores eventos.
                </p>
              </div>

              <Link
                to="/work-with-us"
                className="inline-flex items-center gap-2 bg-white text-black px-8 py-4 rounded-full font-black text-lg hover:bg-yellow-400 hover:text-black transition-all shadow-lg hover:scale-105 active:scale-95 w-fit mt-8 md:mt-0"
              >
                Quero trabalhar em eventos <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* CTA Section for Organizers */}
        <section className="max-w-7xl mx-auto px-4 mb-20">
          <div className="bg-gradient-to-br from-indigo-700 to-purple-800 rounded-[3rem] p-8 md:p-16 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute -top-24 -right-24 w-[400px] h-[400px] bg-white/10 rounded-full blur-3xl opacity-20"></div>
            <div className="absolute -bottom-24 -left-24 w-[300px] h-[300px] bg-indigo-400/20 rounded-full blur-3xl opacity-30"></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
              <div className="lg:w-3/5 text-center lg:text-left">
                <span className="bg-white/20 backdrop-blur-md text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full mb-6 inline-block">Área do Produtor</span>
                <h2 className="font-black mb-8 leading-none tracking-tighter flex flex-col gap-2">
                  <span className="text-2xl md:text-3xl text-indigo-100">Sua produção merece</span>
                  <span className="text-5xl md:text-7xl text-indigo-300 uppercase drop-shadow-sm">EXCELÊNCIA.</span>
                </h2>
                <p className="text-lg md:text-xl text-indigo-100 mb-10 max-w-xl leading-relaxed font-medium">
                  Gestão completa de staff, fornecedores e mailing com a menor taxa do mercado. Comece hoje mesmo.
                </p>
                <div className="flex flex-wrap justify-center lg:justify-start gap-6">
                  <Link to="/para-produtores" className="bg-white text-indigo-700 px-8 py-4 rounded-[2rem] font-black text-xl hover:scale-105 transition shadow-2xl shadow-indigo-900/50 flex items-center gap-3 active:scale-95 animate-pulse">
                    Descobrir Vantagens <ArrowRight className="w-6 h-6" />
                  </Link>
                  <div className="flex items-center gap-4 text-indigo-200">
                    <div className="flex -space-x-3">
                      {[1, 2, 3, 4].map(i => (
                        <img key={i} src={`https://i.pravatar.cc/100?u=${i + 20}`} className="w-12 h-12 rounded-full border-2 border-indigo-700 shadow-xl" alt="Producer" />
                      ))}
                    </div>
                    <div className="text-left">
                      <p className="font-black text-white text-lg">+2.000</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest">Produtores Ativos</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:w-2/5 group hidden lg:block text-right">
                <div className="relative inline-block">
                  <img
                    src="https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=1200&auto=format&fit=crop"
                    alt="Management"
                    className="relative rounded-[2.5rem] shadow-2xl border-4 border-white/20 max-w-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </MainLayout>
  );
};

export default Index;
