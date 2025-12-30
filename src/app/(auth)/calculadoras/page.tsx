'use client';

import Link from 'next/link';
import {
  Calculator,
  Scale,
  Gavel,
  Heart,
  Shield,
  Building,
  FileText,
  Calendar,
  DollarSign,
  Clock,
  Users,
  ArrowRight,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Calculadora {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  popular?: boolean;
}

interface AreaCalculadoras {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  calculadoras: Calculadora[];
}

const areas: AreaCalculadoras[] = [
  {
    title: 'Trabalhista',
    description: 'Cálculos de verbas trabalhistas e rescisórias',
    icon: Building,
    color: 'text-blue-500',
    calculadoras: [
      {
        title: 'FGTS',
        description: 'Correção de saldo com TR e juros 3% a.a.',
        href: '/calculadoras/trabalhista/fgts',
        icon: Building,
        popular: true,
      },
      {
        title: 'Verbas Rescisórias',
        description: 'Cálculo completo de rescisão de contrato',
        href: '/calculadoras/trabalhista/verbas-rescisorias',
        icon: FileText,
        popular: true,
      },
      {
        title: 'Horas Extras',
        description: 'Adicional de horas extras com reflexos',
        href: '/calculadoras/trabalhista/horas-extras',
        icon: Clock,
        popular: true,
      },
      {
        title: 'Adicional Noturno',
        description: 'Adicional de 20% sobre horas noturnas',
        href: '/calculadoras/trabalhista/adicional-noturno',
        icon: Clock,
      },
      {
        title: 'Férias',
        description: 'Férias vencidas, proporcionais + 1/3',
        href: '/calculadoras/trabalhista/ferias',
        icon: Calendar,
      },
      {
        title: '13º Salário',
        description: 'Décimo terceiro proporcional e integral',
        href: '/calculadoras/trabalhista/decimo-terceiro',
        icon: DollarSign,
      },
      {
        title: 'Multa 40% FGTS',
        description: 'Multa rescisória sobre saldo FGTS',
        href: '/calculadoras/trabalhista/multa-fgts',
        icon: DollarSign,
      },
      {
        title: 'Aviso Prévio',
        description: 'Aviso prévio proporcional ao tempo de serviço',
        href: '/calculadoras/trabalhista/aviso-previo',
        icon: FileText,
      },
    ],
  },
  {
    title: 'Previdenciário',
    description: 'Cálculos de benefícios do INSS',
    icon: Shield,
    color: 'text-green-500',
    calculadoras: [
      {
        title: 'INSS',
        description: 'Contribuição previdenciária mensal',
        href: '/calculadoras/previdenciario/inss',
        icon: Shield,
        popular: true,
      },
      {
        title: 'Aposentadoria',
        description: 'Simulação de tempo e valor de aposentadoria',
        href: '/calculadoras/previdenciario/aposentadoria',
        icon: Users,
      },
      {
        title: 'RMI',
        description: 'Renda Mensal Inicial do benefício',
        href: '/calculadoras/previdenciario/rmi',
        icon: Calculator,
      },
      {
        title: 'Revisão da Vida Toda',
        description: 'Recálculo com contribuições anteriores a 1994',
        href: '/calculadoras/previdenciario/revisao-vida-toda',
        icon: Calculator,
      },
    ],
  },
  {
    title: 'Família',
    description: 'Cálculos de direito de família',
    icon: Heart,
    color: 'text-pink-500',
    calculadoras: [
      {
        title: 'Pensão Alimentícia',
        description: 'Cálculo e atualização de pensão',
        href: '/calculadoras/familia/pensao',
        icon: Heart,
        popular: true,
      },
      {
        title: 'Divórcio',
        description: 'Partilha de bens e patrimônio',
        href: '/calculadoras/familia/divorcio',
        icon: Scale,
      },
      {
        title: 'Guarda Compartilhada',
        description: 'Divisão de despesas com filhos',
        href: '/calculadoras/familia/guarda',
        icon: Users,
      },
    ],
  },
  {
    title: 'Criminal',
    description: 'Cálculos de execução penal',
    icon: Gavel,
    color: 'text-red-500',
    calculadoras: [
      {
        title: 'Dosimetria de Pena',
        description: 'Cálculo trifásico da pena',
        href: '/calculadoras/criminal/dosimetria',
        icon: Gavel,
        popular: true,
      },
      {
        title: 'Progressão de Regime',
        description: 'Data para progressão de regime prisional',
        href: '/calculadoras/criminal/progressao',
        icon: Shield,
        popular: true,
      },
      {
        title: 'Detração Penal',
        description: 'Desconto de tempo de prisão cautelar',
        href: '/calculadoras/criminal/detracao',
        icon: Calculator,
      },
    ],
  },
  {
    title: 'Cível',
    description: 'Cálculos de correção e liquidação',
    icon: Scale,
    color: 'text-purple-500',
    calculadoras: [
      {
        title: 'Correção Monetária',
        description: 'Atualização de valores por índices oficiais',
        href: '/calculadoras/civel/correcao-monetaria',
        icon: DollarSign,
        popular: true,
      },
      {
        title: 'Juros Moratórios',
        description: 'Cálculo de juros simples e compostos',
        href: '/calculadoras/civel/juros',
        icon: Calculator,
      },
      {
        title: 'Danos Morais',
        description: 'Estimativa baseada em jurisprudência',
        href: '/calculadoras/civel/danos-morais',
        icon: Scale,
      },
      {
        title: 'Liquidação de Sentença',
        description: 'Cálculo completo com correção e juros',
        href: '/calculadoras/civel/liquidacao',
        icon: FileText,
        popular: true,
      },
    ],
  },
];

export default function CalculadorasPage() {
  return (
    <div className="container mx-auto py-6 px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="h-8 w-8" />
          Calculadoras Jurídicas
        </h1>
        <p className="text-muted-foreground mt-2">
          Mais de 20 calculadoras precisas para todas as áreas do direito
        </p>
      </div>

      {/* Popular Calculators */}
      <Card>
        <CardHeader>
          <CardTitle>Mais Utilizadas</CardTitle>
          <CardDescription>As calculadoras mais acessadas pelos advogados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {areas
              .flatMap((area) =>
                area.calculadoras
                  .filter((calc) => calc.popular)
                  .map((calc) => ({ ...calc, area: area.title, areaColor: area.color }))
              )
              .slice(0, 8)
              .map((calc) => (
                <Link
                  key={calc.href}
                  href={calc.href}
                  className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <calc.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{calc.title}</p>
                    <p className="text-xs text-muted-foreground">{calc.area}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
          </div>
        </CardContent>
      </Card>

      {/* Areas */}
      <div className="space-y-6">
        {areas.map((area) => (
          <Card key={area.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <area.icon className={`h-5 w-5 ${area.color}`} />
                {area.title}
              </CardTitle>
              <CardDescription>{area.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {area.calculadoras.map((calc) => (
                  <Link
                    key={calc.href}
                    href={calc.href}
                    className="group relative flex flex-col rounded-lg border p-4 hover:border-primary hover:shadow-sm transition-all"
                  >
                    {calc.popular && (
                      <Badge className="absolute -top-2 -right-2" variant="secondary">
                        Popular
                      </Badge>
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <calc.icon className="h-4 w-4" />
                      </div>
                      <h3 className="font-medium">{calc.title}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground flex-1">{calc.description}</p>
                    <div className="mt-3 flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      Acessar
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Calculator className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Cálculos Precisos e Fundamentados</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Todas as calculadoras utilizam índices oficiais (INPC, IPCA, TR, SELIC)
                obtidos diretamente do Banco Central do Brasil e seguem a legislação vigente.
                Os cálculos incluem memória detalhada para anexar em petições.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
