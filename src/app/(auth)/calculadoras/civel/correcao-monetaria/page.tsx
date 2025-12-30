'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Calculator, Download, FileText, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

import { trpc } from '@/lib/trpc/client';
import { formatCurrency, formatPercentage } from '@/lib/utils/formatters';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  valorOriginal: z.string().min(1, 'Informe o valor original'),
  dataInicio: z.date({ message: 'Selecione a data inicial' }),
  dataFim: z.date({ message: 'Selecione a data final' }),
  indice: z.enum(['inpc', 'ipca', 'tr', 'selic', 'cdi', 'igpm', 'incc']),
  incluirJuros: z.boolean(),
  taxaJuros: z.string().optional(),
  tipoJuros: z.enum(['simples', 'composto']).optional(),
});

type FormData = z.infer<typeof formSchema>;

const INDICES = [
  { value: 'inpc', label: 'INPC', description: 'Índice Nacional de Preços ao Consumidor (IBGE)' },
  { value: 'ipca', label: 'IPCA', description: 'Índice de Preços ao Consumidor Amplo (IBGE)' },
  { value: 'igpm', label: 'IGP-M', description: 'Índice Geral de Preços - Mercado (FGV)' },
  { value: 'incc', label: 'INCC', description: 'Índice Nacional de Custo da Construção (FGV)' },
  { value: 'tr', label: 'TR', description: 'Taxa Referencial (Banco Central)' },
  { value: 'selic', label: 'SELIC', description: 'Taxa básica de juros (Banco Central)' },
  { value: 'cdi', label: 'CDI', description: 'Certificado de Depósito Interbancário' },
];

export default function CorrecaoMonetariaCalculatorPage() {
  const [result, setResult] = useState<any>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      valorOriginal: '',
      indice: 'inpc',
      incluirJuros: false,
      taxaJuros: '1',
      tipoJuros: 'simples',
    },
  });

  const incluirJuros = form.watch('incluirJuros');

  const calculateMutation = trpc.calculadoras.correcaoMonetaria.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success('Cálculo realizado com sucesso!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: FormData) => {
    calculateMutation.mutate({
      valorOriginal: parseFloat(data.valorOriginal.replace(/\./g, '').replace(',', '.')),
      dataInicio: data.dataInicio,
      dataFim: data.dataFim,
      indice: data.indice,
      incluirJuros: data.incluirJuros,
      taxaJuros: data.taxaJuros ? parseFloat(data.taxaJuros) : undefined,
      tipoJuros: data.tipoJuros,
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="h-8 w-8 text-purple-500" />
          Calculadora de Correção Monetária
        </h1>
        <p className="text-muted-foreground mt-2">
          Atualize valores com índices oficiais e cálculo de juros
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Dados do Cálculo
            </CardTitle>
            <CardDescription>
              Informe os dados para calcular a correção monetária
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="valorOriginal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Valor Original (R$)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="10.000,00"
                          {...field}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '');
                            const formatted = (parseInt(value) / 100).toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            });
                            field.onChange(formatted === 'NaN' ? '' : formatted);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Valor a ser corrigido monetariamente
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="dataInicio"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data Inicial</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                                ) : (
                                  <span>Selecione...</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date('1990-01-01')
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Data do valor original
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dataFim"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data Final</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  'pl-3 text-left font-normal',
                                  !field.value && 'text-muted-foreground'
                                )}
                              >
                                {field.value ? (
                                  format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                                ) : (
                                  <span>Selecione...</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date('1990-01-01')
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Data para atualização
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="indice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Índice de Correção</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o índice..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INDICES.map((indice) => (
                            <SelectItem key={indice.value} value={indice.value}>
                              <div>
                                <div className="font-medium">{indice.label}</div>
                                <div className="text-xs text-muted-foreground">{indice.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="incluirJuros"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Incluir Juros
                        </FormLabel>
                        <FormDescription>
                          Adicionar juros moratórios ao cálculo
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {incluirJuros && (
                  <div className="space-y-4 p-4 rounded-lg border bg-muted/50">
                    <h4 className="font-medium">Configuração de Juros</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="taxaJuros"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Taxa de Juros (% a.m.)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="1"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tipoJuros"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Juros</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="simples">Juros Simples</SelectItem>
                                <SelectItem value="composto">Juros Compostos</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={calculateMutation.isPending}
                >
                  {calculateMutation.isPending ? (
                    <>Calculando...</>
                  ) : (
                    <>
                      <Calculator className="mr-2 h-4 w-4" />
                      Calcular Correção
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-6">
          {result && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Resultado do Cálculo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                      <p className="text-sm text-purple-700">Valor Total Atualizado</p>
                      <p className="text-3xl font-bold text-purple-700">
                        {formatCurrency(result.valorTotal)}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Valor Original</p>
                        <p className="text-xl font-bold">
                          {formatCurrency(result.valorOriginal)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Valor Corrigido</p>
                        <p className="text-xl font-bold">
                          {formatCurrency(result.valorCorrigido)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                        <p className="text-sm text-green-700">Correção Monetária</p>
                        <p className="text-xl font-bold text-green-700">
                          +{formatCurrency(result.correcaoMonetaria)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Fator de Correção</p>
                        <p className="text-xl font-bold">
                          {result.fatorCorrecao.toFixed(6)}
                        </p>
                      </div>
                    </div>

                    {result.juros > 0 && (
                      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <p className="text-sm text-amber-700">Juros Moratórios</p>
                        <p className="text-xl font-bold text-amber-700">
                          +{formatCurrency(result.juros)}
                        </p>
                      </div>
                    )}
                  </div>

                  <Separator className="my-6" />

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <Download className="mr-2 h-4 w-4" />
                      Exportar PDF
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <FileText className="mr-2 h-4 w-4" />
                      Salvar Cálculo
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Resumo */}
              <Card>
                <CardHeader>
                  <CardTitle>Resumo do Cálculo</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Valor Original:</span>
                      <span className="font-medium">{formatCurrency(result.valorOriginal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">(+) Correção Monetária:</span>
                      <span className="font-medium text-green-600">+{formatCurrency(result.correcaoMonetaria)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal Corrigido:</span>
                      <span className="font-medium">{formatCurrency(result.valorCorrigido)}</span>
                    </div>
                    {result.juros > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">(+) Juros:</span>
                          <span className="font-medium text-amber-600">+{formatCurrency(result.juros)}</span>
                        </div>
                      </>
                    )}
                    <Separator />
                    <div className="flex justify-between font-bold text-base">
                      <span>Total:</span>
                      <span className="text-purple-600">{formatCurrency(result.valorTotal)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {!result && (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhum cálculo realizado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Preencha o formulário e clique em calcular para ver os resultados
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Legal Notes */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Fundamentação Legal e Índices</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            A correção monetária visa preservar o poder de compra da moeda, atualizando
            valores defasados ao longo do tempo.
          </p>

          <div className="grid gap-4 md:grid-cols-2 mt-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">Justiça Trabalhista</h4>
              <p className="text-blue-700 text-sm">
                <strong>IPCA-E ou TR</strong> - Conforme ADC 58 do STF e art. 39, § 1º,
                da Lei 8.177/91.
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-semibold text-green-800 mb-2">Justiça Cível</h4>
              <p className="text-green-700 text-sm">
                <strong>INPC</strong> - Utilizado pela Justiça Federal e Estadual
                para atualização de débitos judiciais.
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-2">Fazenda Pública</h4>
              <p className="text-amber-700 text-sm">
                <strong>SELIC</strong> - Para débitos tributários, engloba correção
                e juros (art. 13, Lei 9.065/95).
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <h4 className="font-semibold text-purple-800 mb-2">Contratos</h4>
              <p className="text-purple-700 text-sm">
                <strong>IGP-M</strong> - Tradicionalmente usado em contratos de
                locação e prestação de serviços.
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-semibold mb-2">Juros Moratórios</h4>
            <ul className="text-sm">
              <li><strong>Art. 406 CC:</strong> Taxa SELIC (ou 1% a.m. se não estipulada)</li>
              <li><strong>Súmula 362 STJ:</strong> Juros moratórios da data do evento danoso</li>
              <li><strong>Relações de consumo:</strong> Art. 52, § 1º do CDC</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
