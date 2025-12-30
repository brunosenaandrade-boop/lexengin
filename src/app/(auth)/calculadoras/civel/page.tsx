'use client';

import Link from 'next/link';
import {
  Calculator,
  Scale,
  DollarSign,
  FileText,
  TrendingUp,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const calculadoras = [
  {
    title: 'Correção Monetária',
    description: 'Atualização de valores por índices oficiais (INPC, IPCA, IGP-M, TR, SELIC) com memória de cálculo detalhada.',
    href: '/calculadoras/civel/correcao-monetaria',
    icon: TrendingUp,
    popular: true,
    fields: ['Valor original', 'Data início', 'Data fim', 'Índice correção'],
  },
  {
    title: 'Juros Moratórios',
    description: 'Cálculo de juros simples ou compostos sobre valores devidos, conforme taxa legal ou contratual.',
    href: '/calculadoras/civel/juros',
    icon: DollarSign,
    fields: ['Valor principal', 'Taxa juros', 'Período', 'Tipo (simples/composto)'],
  },
  {
    title: 'Danos Morais',
    description: 'Estimativa de valor de indenização por danos morais com base em parâmetros jurisprudenciais e critérios objetivos.',
    href: '/calculadoras/civel/danos-morais',
    icon: Scale,
    fields: ['Tipo de dano', 'Gravidade', 'Capacidade econômica', 'Precedentes'],
  },
  {
    title: 'Liquidação de Sentença',
    description: 'Cálculo completo para liquidação de sentença com correção monetária, juros, honorários e custas.',
    href: '/calculadoras/civel/liquidacao',
    icon: FileText,
    popular: true,
    fields: ['Parcelas', 'Índice', 'Juros', 'Honorários', 'Multa art. 523'],
  },
];

export default function CivelCalculadorasPage() {
  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/calculadoras">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Scale className="h-8 w-8 text-purple-500" />
            Calculadoras Cíveis
          </h1>
          <p className="text-muted-foreground mt-1">
            Cálculos de correção monetária, juros e liquidação
          </p>
        </div>
      </div>

      {/* Grid de calculadoras */}
      <div className="grid gap-4 md:grid-cols-2">
        {calculadoras.map((calc) => (
          <Card key={calc.href} className="group hover:shadow-md transition-all">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
                    <calc.icon className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{calc.title}</CardTitle>
                    {calc.popular && (
                      <Badge variant="secondary" className="mt-1">Popular</Badge>
                    )}
                  </div>
                </div>
              </div>
              <CardDescription className="mt-2">{calc.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Campos principais:</p>
                <div className="flex flex-wrap gap-1">
                  {calc.fields.map((field) => (
                    <Badge key={field} variant="outline" className="text-xs">
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button className="w-full" asChild>
                <Link href={calc.href}>
                  Acessar Calculadora
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Informações */}
      <Card className="bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
              <Calculator className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold">Fundamentação Legal</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Os cálculos cíveis seguem o Código Civil (art. 406 - Juros legais),
                CPC (arts. 509-512 - Liquidação, art. 523 - Cumprimento de sentença),
                Lei 9.494/97 (Fazenda Pública) e jurisprudência consolidada do STJ.
                Os índices são obtidos diretamente do Banco Central do Brasil.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
