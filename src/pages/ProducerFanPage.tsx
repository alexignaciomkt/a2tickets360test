
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Heart,
  MessageCircle,
  Share2,
  MapPin,
  Phone,
  Mail,
  Users,
  Calendar,
  ShoppingBag,
  Star,
  Plus,
  Camera,
  ThumbsUp,
  MoreHorizontal,
  Info,
  Globe,
  Briefcase,
  Ticket as TicketIcon,
  QrCode
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { organizerService } from '@/services/organizerService';

const ProducerFanPage = () => {
  const { slug } = useParams();
  const [activeTab, setActiveTab] = useState('timeline');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(2547);
  const [hasLiked, setHasLiked] = useState(false);
  const { toast } = useToast();

  const [producerData, setProducerData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [producerEvents, setProducerEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (slug) {
      loadProducer();
    }
  }, [slug]);

  const loadProducer = async () => {
    try {
      setLoading(true);
      const data = await organizerService.getProducerBySlug(slug!);
      setProducerData(data);

      if (data?.id) {
        const [postsData, eventsData] = await Promise.all([
          organizerService.getPosts(data.id),
          organizerService.getEvents(data.id)
        ]);
        setPosts(postsData);
        setProducerEvents(eventsData.filter((e: any) => e.status === 'published' || e.status === 'active'));
      }
    } catch (err) {
      console.error('Erro ao carregar produtor:', err);
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: 'Produtor não encontrado ou erro de carregamento.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!producerData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-4">
          <Info className="w-12 h-12 text-gray-400 mx-auto" />
          <h2 className="text-xl font-bold">Página não encontrada</h2>
          <p className="text-gray-500">O produtor que você procura não existe ou a URL está incorreta.</p>
          <Button variant="outline" asChild>
            <Link to="/">Voltar para Início</Link>
          </Button>
        </Card>
      </div>
    );
  }

  // Map backend fields to local view
  const producer = {
    id: producerData.id,
    name: producerData.companyName || producerData.name,
    slug: producerData.slug,
    description: producerData.bio || 'Sem descrição disponível.',
    location: producerData.city ? `${producerData.city}, ${producerData.state}` : 'Local não informado',
    phone: producerData.phone || producerData.whatsappNumber,
    email: producerData.email,
    website: producerData.websiteUrl,
    coverImage: producerData.bannerUrl || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=1200&h=400&fit=crop',
    profileImage: producerData.logoUrl || 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400&h=400&fit=crop',
    verified: producerData.profileComplete,
    followers: 0,
    following: false,
    category: producerData.category || 'Produtor Independente',
    instagramUrl: producerData.instagramUrl,
    facebookUrl: producerData.facebookUrl,
    whatsappNumber: producerData.whatsappNumber
  };

  const products = [
    {
      id: '1',
      name: 'Camiseta Festival 2025',
      price: 49.90,
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=300&fit=crop',
      rating: 4.8,
      reviews: 67
    },
    {
      id: '2',
      name: 'Caneca Personalizada',
      price: 29.90,
      image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcf93a?w=300&h=300&fit=crop',
      rating: 4.9,
      reviews: 43
    }
  ];

  const handleFollow = () => {
    setIsFollowing(!isFollowing);
    setFollowersCount(prev => isFollowing ? prev - 1 : prev + 1);
  };

  const handleLike = () => {
    setHasLiked(!hasLiked);
  };

  const handleShareReader = () => {
    const readerLink = `${window.location.origin}/validador`;
    const message = `Olá! Aqui está o link do Validador Pro para o staff: ${readerLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;

    if (/Android|iPhone/i.test(navigator.userAgent)) {
      window.open(whatsappUrl, '_blank');
    } else {
      navigator.clipboard.writeText(readerLink);
      toast({
        title: "Link Copiado!",
        description: "O link do validador foi copiado para a área de transferência.",
      });
    }
  };

  return (
    <div className="bg-[#F0F2F5] min-h-screen">
      {/* Cover & Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-5xl mx-auto px-4">
          <div className="relative h-[250px] md:h-[350px] rounded-b-xl overflow-hidden shadow-inner group">
            <img src={producer.coverImage} className="w-full h-full object-cover" alt="Cover" />
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-all"></div>
            <div className="absolute bottom-4 right-4">
              <button className="bg-white/90 hover:bg-white backdrop-blur text-gray-900 px-4 py-2 rounded-lg font-bold text-sm shadow flex items-center gap-2 transition-all">
                <Camera className="w-4 h-4" /> Editar Capa
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 -mt-12 md:-mt-20 pb-6 border-b px-8">
            <div className="relative">
              <div className="w-40 h-40 md:w-48 md:h-48 rounded-full border-4 border-white overflow-hidden shadow-lg bg-white">
                <img src={producer.profileImage} className="w-full h-full object-cover" alt="Profile" />
              </div>
              <button className="absolute bottom-4 right-2 bg-gray-200 p-2 rounded-full border border-white shadow-sm hover:bg-gray-300 transition-colors">
                <Camera className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <h1 className="text-3xl font-extrabold text-gray-900">{producer.name}</h1>
                {producer.verified && (
                  <div className="w-6 h-6 bg-[#1877F2] rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-gray-500 font-semibold mb-2">{followersCount.toLocaleString()} seguidores • 12 seguindo</p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleFollow}
                className={isFollowing ? 'bg-gray-200 text-gray-700 hover:bg-gray-300' : 'bg-[#1877F2] text-white hover:bg-[#1567d3]'}
              >
                <TicketIcon className="w-4 h-4 mr-2" />
                {isFollowing ? 'Seguindo' : 'Seguir'}
              </Button>
              <Button variant="outline" className="bg-gray-200 hover:bg-gray-300 border-none font-bold">
                <MessageCircle className="w-4 h-4 mr-2" /> Mensagem
              </Button>
              <Button
                onClick={handleShareReader}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold border-none shadow-sm"
              >
                <QrCode className="w-4 h-4 mr-2" /> Compartilhar Leitor
              </Button>
            </div>
          </div>

          <nav className="flex gap-1 py-1 overflow-x-auto no-scrollbar">
            {['Publicações', 'Sobre', 'Eventos', 'Loja', 'Fotos', 'Vídeos'].map(tab => {
              const tabId = tab === 'Publicações' ? 'timeline' :
                tab === 'Sobre' ? 'about' :
                  tab === 'Eventos' ? 'events' :
                    tab === 'Loja' ? 'store' :
                      tab === 'Fotos' ? 'photos' : 'videos';
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tabId)}
                  className={`px-4 py-4 font-bold transition whitespace-nowrap border-b-4 ${activeTab === tabId ? 'border-[#1877F2] text-[#1877F2]' : 'border-transparent text-gray-600 hover:bg-gray-100'}`}
                >
                  {tab}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 space-y-6">
          <Card className="rounded-xl shadow-sm border-none">
            <CardContent className="p-4 space-y-4">
              <h3 className="font-extrabold text-xl">Apresentação</h3>
              <p className="text-sm text-center text-gray-700 leading-relaxed">{producer.description}</p>
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <Info className="w-5 h-5 text-gray-400" />
                  <span>Página • {producer.category}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span>{producer.location}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-8 space-y-6">
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {posts.length === 0 ? (
                <Card className="p-12 text-center text-gray-500 rounded-xl border-none shadow-sm capitalize font-bold">
                  Nenhuma publicação ainda.
                </Card>
              ) : (
                posts.map(post => (
                  <Card key={post.id} className="rounded-xl shadow-sm border-none overflow-hidden">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex gap-3">
                        <img src={producer.profileImage} className="w-10 h-10 rounded-full border border-gray-100 shadow-sm" alt="Profile" />
                        <div>
                          <h4 className="font-bold text-sm hover:underline cursor-pointer">{producer.name}</h4>
                          <p className="text-xs text-gray-500 flex items-center gap-1">
                            {new Date(post.createdAt).toLocaleDateString()} • <Globe className="w-3 h-3" />
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 pb-4 text-sm text-gray-800 leading-relaxed">{post.caption}</div>
                    {post.imageUrl && (
                      <div className="relative aspect-video overflow-hidden">
                        <img src={post.imageUrl} className="w-full h-full object-cover" alt="Post" />
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {producerEvents.length === 0 ? (
                <div className="col-span-full">
                  <Card className="p-12 text-center text-gray-500 rounded-xl border-none shadow-sm capitalize font-bold">
                    Nenhum evento publicado.
                  </Card>
                </div>
              ) : (
                producerEvents.map(event => (
                  <Card key={event.id} className="overflow-hidden shadow-sm border-none group cursor-pointer">
                    <div className="relative h-40">
                      <img src={event.bannerUrl || event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <Badge className="absolute top-2 right-2 bg-green-500 border-none">Vendas Abertas</Badge>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-extrabold text-lg mb-2 group-hover:text-[#1877F2] transition-colors">{event.title}</h3>
                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-[#1877F2]" />
                          <span className="font-semibold">{new Date(event.date).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-pink-500" />
                          <span>{event.locationName || event.location?.name}</span>
                        </div>
                      </div>
                      <Link to={`/events/${event.id}`}>
                        <Button className="w-full bg-[#1877F2] hover:bg-[#1567d3] font-bold">Comprar Ingressos</Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}

          {activeTab === 'about' && (
            <Card className="rounded-xl shadow-sm border-none">
              <CardContent className="p-6 space-y-6">
                <h2 className="text-2xl font-black text-gray-900 border-b pb-4">Sobre {producer.name}</h2>
                <div className="space-y-4">
                  <p className="text-gray-700 leading-relaxed font-medium">{producer.description}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProducerFanPage;
