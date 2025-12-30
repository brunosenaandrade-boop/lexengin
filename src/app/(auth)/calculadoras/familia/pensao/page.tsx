'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Calculator, Download, FileText, Heart } from 'lucide-react';
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
  tipoPensao: z.enum(['percentual_renda', 'valor_fixo', 'salarios_minimos', 'misto']),
  rendaMensalAlimentante: z.string().min(1, 'Informe a renda mensal'),
  tipoRenda: z.enum(['empregado', 'autonomo', 'empresario', 'aposentado', 'desempregado']),
  percentualPensao: z.string().optional(),
  valorFixo: z.string().optional(),
  quantidadeSalariosMinimos: z.string().optional(),
  dataFixacao: z.date({ message: 'Selecione a data de fixação' }),
  dataCalculo: z.date({ message: 'Selecione a data de cálculo' }),
  indiceCorrecao: z.enum(['inpc', 'ipca', 'igpm', 'salario_minimo']),
  incluirDecimoTerceiro: z.boolean(),
  incluirFerias: z.boolean(),
  incluirPLR: z.boolean(),
  quantidadeFilhos: z.string().min(1, 'Informe a quantidade de filhos'),
  necessidadesEspeciais: z.boolean().optional(),
});

type FormData = z.infer<typeof formSchema>;

const TIPOS_PENSAO = [
  { value: 'percentual_renda', label: 'Percentual da Renda', description: 'Ex: 30% da renda líquida' },
  { value: 'valor_fixo', label: 'Valor Fixo', description: 'Valor fixo mensal' },
  { value: 'salarios_minimos', label: 'Salários Mínimos', description: 'Ex: 2 salários mínimos' },
  { value: 'misto', label: 'Misto', description: 'Valor fixo + percentual excedente' },
];

const TIPOS_RENDA = [
  { value: 'empregado', label: 'Empregado CLT' },
  { value: 'autonomo', label: 'Autônomo' },
  { value: 'empresario', label: 'Empresário' },
  { value: 'aposentado', label: 'Aposentado' },
  { value: 'desempregado', label: 'Desempregado' },
];

const INDICES_CORRECAO = [
  { value: 'inpc', label: 'INPC', description: 'Índice Nacional de Preços ao Consumidor' },
  { value: 'ipca', label: 'IPCA', description: 'Índice de Preços ao Consumidor Amplo' },
  { value: 'igpm', label: 'IGP-M', description: 'Índice Geral de Preços - Mercado' },
  { value: 'salario_minimo', label: 'Salário Mínimo', description: 'Reajuste pelo SM vigente' },
];

export default function PensaoAlimenticiaCalculatorPage() {
  const [result, setResult] = useState<any>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tipoPensao: 'percentual_renda',
      rendaMensalAlimentante: '',
      tipoRenda: 'empregado',
      percentualPensao: '30',
      valorFixo: '',
      quantidadeSalariosMinimos: '1',
      indiceCorrecao: 'inpc',
      incluirDecimoTerceiro: true,
      incluirFerias: true,
      incluirPLR: false,
      quantidadeFilhos: '1',
      necessidadesEspeciais: false,
    },
  });

  const tipoPensao = form.watch('tipoPensao');
  const showPercentual = tipoPensao === 'percentual_renda' || tipoPensao === 'misto';
  const showValorFixo = tipoPensao === 'valor_fixo' || tipoPensao === 'misto';
  const showSalariosMinimos = tipoPensao === 'salarios_minimos';

  const calculateMutation = trpc.calculadoras.pensaoAlimenticia.useMutation({
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
      tipoPensao: data.tipoPensao,
      rendaMensalAlimentante: parseFloat(data.rendaMensalAlimentante.replace(/\./g, '').replace(',', '.')),
      tipoRenda: data.tipoRenda,
      percentualPensao: data.percentualPensao ? parseFloat(data.percentualPensao) : undefined,
      valorFixo: data.valorFixo ? parseFloat(data.valorFixo.replace(/\./g, '').replace(',', '.')) : undefined,
      quantidadeSalariosMinimos: data.quantidadeSalariosMinimos ? parseFloat(data.quantidadeSalariosMinimos) : undefined,
      dataFixacao: data.dataFixacao,
      dataCalculo: data.dataCalculo,
      indiceCorrecao: data.indiceCorrecao,
      incluirDecimoTerceiro: data.incluirDecimoTerceiro,
      incluirFerias: data.incluirFerias,
      incluirPLR: data.incluirPLR,
      quantidadeFilhos: parseInt(data.quantidadeFilhos),
      necessidadesEspeciais: data.necessidadesEspeciais,
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Heart className="h-8 w-8 text-pink-500" />
          Calculadora de Pensão Alimentícia
        </h1>
        <p className="text-muted-foreground mt-2">
          Calcule e atualize o valor da pensão alimentícia com correção monetária
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
              Informe os dados para calcular a pensão alimentícia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="tipoPensao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Pensão</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIPOS_PENSAO.map((tipo) => (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              <div>
                                <div>{tipo.label}</div>
                                <div className="text-xs text-muted-foreground">{tipo.description}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="rendaMensalAlimentante"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Renda Mensal do Alimentante (R$)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="5.000,00"
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tipoRenda"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Renda</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIPOS_RENDA.map((tipo) => (
                              <SelectItem key={tipo.value} value={tipo.value}>
                                {tipo.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {showPercentual && (
                  <FormField
                    control={form.control}
                    name="percentualPensao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Percentual da Pensão (%)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="30"
                            min="1"
                            max="50"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Geralmente entre 15% a 33% por filho
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {showValorFixo && (
                  <FormField
                    control={form.control}
                    name="valorFixo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Valor Fixo (R$)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="1.500,00"
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {showSalariosMinimos && (
                  <FormField
                    control={form.control}
                    name="quantidadeSalariosMinimos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade de Salários Mínimos</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="2"
                            min="0.5"
                            step="0.5"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Atualmente R$ 1.412,00 por salário mínimo
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="dataFixacao"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data de Fixação</FormLabel>
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
                                date > new Date() || date < new Date('2000-01-01')
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormDescription>
                          Data da decisão judicial
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dataCalculo"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data do Cálculo</FormLabel>
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
                                date > new Date() || date < new Date('2000-01-01')
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="indiceCorrecao"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Índice de Correção</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {INDICES_CORRECAO.map((indice) => (
                              <SelectItem key={indice.value} value={indice.value}>
                                <div>
                                  <div>{indice.label}</div>
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
                    name="quantidadeFilhos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantidade de Filhos</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="1"
                            min="1"
                            max="10"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 p-4 rounded-lg border bg-muted/50">
                  <h4 className="font-medium">Verbas Incluídas</h4>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <FormField
                      control={form.control}
                      name="incluirDecimoTerceiro"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">13º Salário</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="incluirFerias"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">1/3 Férias</FormLabel>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="incluirPLR"
                      render={({ field }) => (
                        <FormItem className="flex items-center space-x-2">
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">PLR</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="necessidadesEspeciais"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Necessidades Especiais
                        </FormLabel>
                        <FormDescription>
                          Filho(a) possui necessidades especiais
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
                      Calcular Pensão
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
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border border-pink-200 bg-pink-50 p-4">
                        <p className="text-sm text-pink-700">Valor Mensal Corrigido</p>
                        <p className="text-2xl font-bold text-pink-700">
                          {formatCurrency(result.valorCorrigido)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Valor Original</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(result.valorMensal)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Percentual Efetivo</p>
                        <p className="text-2xl font-bold">
                          {formatPercentage(result.percentualEfetivo)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Valor Anual</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(result.valorAnual)}
                        </p>
                      </div>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-3 gap-4">
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">13º Salário</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(result.decimoTerceiro)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">1/3 Férias</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(result.tercoFerias)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-3 text-center">
                        <p className="text-xs text-muted-foreground">PLR (Est.)</p>
                        <p className="text-lg font-semibold">
                          {formatCurrency(result.plrEstimado)}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                      <p className="text-sm text-green-700">Total Anual</p>
                      <p className="text-2xl font-bold text-green-700">
                        {formatCurrency(result.totalAnual)}
                      </p>
                    </div>
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

              {/* Detalhamento */}
              {result.detalhamento && (
                <Card>
                  <CardHeader>
                    <CardTitle>Memória de Cálculo</CardTitle>
                    <CardDescription>
                      Detalhamento da base de cálculo
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Renda Bruta:</span>
                        <span className="font-medium">{formatCurrency(result.detalhamento.baseCalculo)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">(-) INSS:</span>
                        <span className="font-medium text-red-600">-{formatCurrency(result.detalhamento.descontos.inss)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">(-) IRRF:</span>
                        <span className="font-medium text-red-600">-{formatCurrency(result.detalhamento.descontos.irrf)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Renda Líquida:</span>
                        <span className="font-medium">{formatCurrency(result.detalhamento.rendaLiquida)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Percentual Aplicado:</span>
                        <span className="font-medium">{formatPercentage(result.detalhamento.percentualAplicado)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Valor Calculado:</span>
                        <span className="font-medium">{formatCurrency(result.detalhamento.valorCalculado)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">(+) Correção Monetária:</span>
                        <span className="font-medium text-green-600">+{formatCurrency(result.detalhamento.correcaoMonetaria)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold">
                        <span>Valor Final:</span>
                        <span className="text-pink-600">{formatCurrency(result.valorCorrigido)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!result && (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <Heart className="h-12 w-12 text-muted-foreground mb-4" />
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
          <CardTitle>Fundamentação Legal</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          {result ? (
            <p>{result.fundamentacao}</p>
          ) : (
            <>
              <p>
                O cálculo é realizado conforme os <strong>arts. 1.694 a 1.710 do Código Civil</strong>,
                seguindo o princípio do binômio necessidade-possibilidade.
              </p>
              <ul>
                <li>
                  <strong>Base de Cálculo:</strong> Renda líquida do alimentante após descontos
                  obrigatórios (INSS e IRRF).
                </li>
                <li>
                  <strong>Percentual:</strong> Jurisprudência costuma fixar entre 15% a 33%
                  da renda líquida por filho.
                </li>
                <li>
                  <strong>Verbas Extraordinárias:</strong> 13º salário e 1/3 de férias são
                  frequentemente incluídos na base de cálculo.
                </li>
              </ul>
              <div className="mt-4 p-4 bg-pink-50 rounded-lg border border-pink-200">
                <h4 className="font-semibold text-pink-800 mb-2">Súmula 490/STJ</h4>
                <p className="text-pink-700 text-sm">
                  &quot;A pensão alimentícia fixada em salários mínimos garante ao alimentando
                  a atualização automática do seu valor.&quot;
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
