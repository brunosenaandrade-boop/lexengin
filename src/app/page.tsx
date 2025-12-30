import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Scale,
  Calculator,
  Briefcase,
  Users,
  FileText,
  Shield,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const features = [
  {
    icon: Calculator,
    title: 'Calculadoras Jurídicas',
    description: 'Mais de 20 calculadoras precisas para todas as áreas do direito com memória de cálculo detalhada.',
  },
  {
    icon: Briefcase,
    title: 'Gestão de Processos',
    description: 'Monitoramento automático de todos os tribunais do Brasil com alertas de movimentações.',
  },
  {
    icon: Users,
    title: 'Portal do Cliente',
    description: 'Seus clientes acompanham os processos em tempo real com notificações via WhatsApp.',
  },
  {
    icon: FileText,
    title: 'Documentos com IA',
    description: 'Geração de petições e contratos com inteligência artificial híbrida (Claude + GPT).',
  },
];

const benefits = [
  'Índices econômicos atualizados do BACEN',
  'Monitoramento de todos os tribunais',
  'Integração com PJe, e-SAJ e Projudi',
  'Assinatura eletrônica de documentos',
  'Gestão financeira completa',
  'API para integrações personalizadas',
];

export default function LandingPage() {
  // For now, redirect to dashboard (remove this line when auth is implemented)
  // redirect('/dashboard');

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">LexEngine</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Funcionalidades
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Planos
            </Link>
            <Link href="#about" className="text-sm text-muted-foreground hover:text-foreground">
              Sobre
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Entrar</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard">Acessar Sistema</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            O Software Jurídico
            <br />
            <span className="text-primary">Mais Completo do Brasil</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
            Calculadoras precisas, gestão de processos, documentos com IA e muito mais.
            Tudo em uma única plataforma 100% serverless.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/dashboard">
                Começar Agora
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/calculadoras">Ver Calculadoras</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">Funcionalidades Completas</h2>
            <p className="mt-2 text-muted-foreground">
              Tudo que um escritório jurídico moderno precisa
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardContent className="pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Por que escolher o LexEngine?
              </h2>
              <p className="text-muted-foreground mb-8">
                Desenvolvido por advogados para advogados, o LexEngine reúne todas
                as ferramentas necessárias para otimizar a gestão do seu escritório
                e aumentar sua produtividade.
              </p>
              <ul className="space-y-3">
                {benefits.map((benefit) => (
                  <li key={benefit} className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-primary/5 rounded-2xl blur-3xl" />
                <Card className="relative w-full max-w-md">
                  <CardContent className="pt-6">
                    <div className="text-center mb-6">
                      <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                      <h3 className="text-xl font-bold">100% Seguro</h3>
                      <p className="text-sm text-muted-foreground mt-2">
                        Seus dados protegidos com criptografia de ponta a ponta
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-primary">20+</div>
                        <div className="text-xs text-muted-foreground">Calculadoras</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-primary">27</div>
                        <div className="text-xs text-muted-foreground">Tribunais</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-primary">99.9%</div>
                        <div className="text-xs text-muted-foreground">Uptime</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">
            Pronto para transformar seu escritório?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Comece agora mesmo com acesso completo a todas as calculadoras.
            Sem necessidade de cartão de crédito.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/dashboard">
              Começar Gratuitamente
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              <span className="font-bold">LexEngine</span>
            </div>
            <p className="text-sm text-muted-foreground">
              2024 LexEngine. Todos os direitos reservados.
            </p>
            <div className="flex gap-4 text-sm text-muted-foreground">
              <Link href="/termos" className="hover:text-foreground">Termos</Link>
              <Link href="/privacidade" className="hover:text-foreground">Privacidade</Link>
              <Link href="/contato" className="hover:text-foreground">Contato</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
