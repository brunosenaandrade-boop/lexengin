'use client';

import Link from 'next/link';
import {
  Calculator,
  Heart,
  Scale,
  Users,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const calculadoras = [
  {
    title: 'Pensão Alimentícia',
    description: 'Cálculo e atualização de pensão alimentícia com correção monetária pelo índice escolhido (INPC, IPCA, IGP-M).',
    href: '/calculadoras/familia/pensao',
    icon: Heart,
    popular: true,
    fields: ['Valor base', 'Índice correção', 'Período', 'Parcelas atrasadas'],
  },
  {
    title: 'Divórcio - Partilha de Bens',
    description: 'Cálculo da partilha de bens no divórcio considerando o regime de comunhão e a natureza dos bens.',
    href: '/calculadoras/familia/divorcio',
    icon: Scale,
    fields: ['Bens comuns', 'Bens particulares', 'Regime de bens', 'Dívidas'],
  },
  {
    title: 'Guarda Compartilhada',
    description: 'Divisão de despesas com filhos na guarda compartilhada, considerando a capacidade econômica de cada genitor.',
    href: '/calculadoras/familia/guarda',
    icon: Users,
    fields: ['Renda pai', 'Renda mãe', 'Despesas filhos', 'Tempo convivência'],
  },
];

export default function FamiliaCalculadorasPage() {
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
            <Heart className="h-8 w-8 text-pink-500" />
            Calculadoras de Família
          </h1>
          <p className="text-muted-foreground mt-1">
            Cálculos de direito de família e sucessões
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
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-pink-500/10">
                    <calc.icon className="h-5 w-5 text-pink-500" />
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
      <Card className="bg-pink-50 dark:bg-pink-950/20 border-pink-200 dark:border-pink-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-500/10">
              <Calculator className="h-6 w-6 text-pink-500" />
            </div>
            <div>
              <h3 className="font-semibold">Fundamentação Legal</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Os cálculos de família seguem o Código Civil (arts. 1.694 a 1.710 - Alimentos,
                arts. 1.639 a 1.688 - Regime de Bens), Lei 5.478/68 (Ação de Alimentos) e
                Lei 13.058/2014 (Guarda Compartilhada). A correção monetária utiliza índices
                oficiais conforme determinação judicial.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
