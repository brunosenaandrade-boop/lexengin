'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Calculator, Download, FileText, Users, CheckCircle2, XCircle, Clock } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  dataNascimento: z.date({ message: 'Selecione a data de nascimento' }),
  sexo: z.enum(['masculino', 'feminino']),
  tipoAposentadoria: z.enum(['idade', 'tempo_contribuicao', 'especial', 'professor', 'deficiencia']),
  regime: z.enum(['rgps', 'rpps']),
  tempoContribuicaoAnos: z.string().min(1, 'Informe o tempo de contribuição'),
  tempoContribuicaoMeses: z.string().optional(),
  mediaSalariosContribuicao: z.string().min(1, 'Informe a média salarial'),
  carenciaCompleta: z.boolean(),
  atividadeEspecialTipo: z.enum(['15_anos', '20_anos', '25_anos']).optional(),
  atividadeEspecialMeses: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const TIPOS_APOSENTADORIA = [
  { value: 'idade', label: 'Por Idade', description: 'Requisitos de idade e tempo de contribuição' },
  { value: 'tempo_contribuicao', label: 'Por Tempo de Contribuição', description: 'Para quem completou requisitos antes da reforma' },
  { value: 'especial', label: 'Especial', description: 'Para atividades insalubres ou perigosas' },
  { value: 'professor', label: 'Professor', description: 'Magistério na educação básica' },
  { value: 'deficiencia', label: 'Pessoa com Deficiência', description: 'Regras diferenciadas conforme grau' },
];

const REGIMES = [
  { value: 'rgps', label: 'RGPS', description: 'Regime Geral (INSS)' },
  { value: 'rpps', label: 'RPPS', description: 'Regime Próprio (Servidores)' },
];

export default function AposentadoriaCalculatorPage() {
  const [result, setResult] = useState<any>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sexo: 'masculino',
      tipoAposentadoria: 'idade',
      regime: 'rgps',
      tempoContribuicaoAnos: '',
      tempoContribuicaoMeses: '0',
      mediaSalariosContribuicao: '',
      carenciaCompleta: true,
    },
  });

  const tipoAposentadoria = form.watch('tipoAposentadoria');
  const showAtividadeEspecial = tipoAposentadoria === 'especial';

  const calculateMutation = trpc.calculadoras.aposentadoria.useMutation({
    onSuccess: (data) => {
      setResult(data);
      toast.success('Cálculo realizado com sucesso!');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const onSubmit = (data: FormData) => {
    const tempoAnos = parseInt(data.tempoContribuicaoAnos) || 0;
    const tempoMeses = parseInt(data.tempoContribuicaoMeses || '0') || 0;
    const tempoTotalMeses = (tempoAnos * 12) + tempoMeses;

    calculateMutation.mutate({
      dataNascimento: data.dataNascimento,
      sexo: data.sexo,
      tipoAposentadoria: data.tipoAposentadoria,
      regime: data.regime,
      tempoContribuicaoMeses: tempoTotalMeses,
      mediaSalariosContribuicao: parseFloat(data.mediaSalariosContribuicao.replace(/\./g, '').replace(',', '.')),
      carenciaCompleta: data.carenciaCompleta,
      atividadeEspecial: showAtividadeEspecial && data.atividadeEspecialTipo ? {
        tipo: data.atividadeEspecialTipo,
        tempoMeses: parseInt(data.atividadeEspecialMeses || '0') || 0,
      } : undefined,
    });
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Users className="h-8 w-8 text-green-500" />
          Calculadora de Aposentadoria
        </h1>
        <p className="text-muted-foreground mt-2">
          Simule a elegibilidade e valor do benefício após a EC 103/2019
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Dados do Segurado
            </CardTitle>
            <CardDescription>
              Informe os dados para simular a aposentadoria
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="dataNascimento"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Data de Nascimento</FormLabel>
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
                                date > new Date() || date < new Date('1940-01-01')
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sexo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sexo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="masculino">Masculino</SelectItem>
                            <SelectItem value="feminino">Feminino</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="tipoAposentadoria"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Aposentadoria</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIPOS_APOSENTADORIA.map((tipo) => (
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

                <FormField
                  control={form.control}
                  name="regime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Regime Previdenciário</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {REGIMES.map((regime) => (
                            <SelectItem key={regime.value} value={regime.value}>
                              <div>
                                <div>{regime.label}</div>
                                <div className="text-xs text-muted-foreground">{regime.description}</div>
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
                    name="tempoContribuicaoAnos"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tempo de Contribuição (Anos)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="25"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tempoContribuicaoMeses"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meses Adicionais</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="6"
                            min="0"
                            max="11"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="mediaSalariosContribuicao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Média dos Salários de Contribuição (R$)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="4.500,00"
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
                        Média de todos os salários desde julho/1994
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="carenciaCompleta"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">
                          Carência Completa
                        </FormLabel>
                        <FormDescription>
                          180 contribuições mensais mínimas
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

                {showAtividadeEspecial && (
                  <div className="space-y-4 p-4 rounded-lg border bg-muted/50">
                    <h4 className="font-medium">Atividade Especial</h4>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="atividadeEspecialTipo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Exposição</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="25_anos">25 anos (baixo risco)</SelectItem>
                                <SelectItem value="20_anos">20 anos (médio risco)</SelectItem>
                                <SelectItem value="15_anos">15 anos (alto risco)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="atividadeEspecialMeses"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tempo Especial (Meses)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="180"
                                {...field}
                              />
                            </FormControl>
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
                      Simular Aposentadoria
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
                    Resultado da Simulação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Eligibility Status */}
                  <div className={cn(
                    'rounded-lg p-4 mb-6',
                    result.elegivel
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-amber-50 border border-amber-200'
                  )}>
                    <div className="flex items-center gap-2">
                      {result.elegivel ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : (
                        <Clock className="h-6 w-6 text-amber-600" />
                      )}
                      <h3 className={cn(
                        'font-semibold text-lg',
                        result.elegivel ? 'text-green-800' : 'text-amber-800'
                      )}>
                        {result.elegivel ? 'Elegível para Aposentadoria' : 'Ainda não Elegível'}
                      </h3>
                    </div>
                    {result.motivoInelegibilidade && (
                      <p className="text-sm text-amber-700 mt-2">
                        {result.motivoInelegibilidade}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Idade Atual</p>
                        <p className="text-2xl font-bold">
                          {result.idadeAtual} anos
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Mínimo: {result.idadeMinima} anos
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Tempo de Contribuição</p>
                        <p className="text-2xl font-bold">
                          {result.tempoContribuicaoAnos} anos
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Mínimo: {result.tempoMinimoAnos} anos
                        </p>
                      </div>
                    </div>

                    {result.idadeFaltante > 0 || result.tempoFaltanteMeses > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {result.idadeFaltante > 0 && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm text-amber-700">Idade Faltante</p>
                            <p className="text-2xl font-bold text-amber-700">
                              {result.idadeFaltante} anos
                            </p>
                          </div>
                        )}
                        {result.tempoFaltanteMeses > 0 && (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                            <p className="text-sm text-amber-700">Tempo Faltante</p>
                            <p className="text-2xl font-bold text-amber-700">
                              {Math.floor(result.tempoFaltanteMeses / 12)} anos e {result.tempoFaltanteMeses % 12} meses
                            </p>
                          </div>
                        )}
                      </div>
                    ) : null}

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Coeficiente de Cálculo</p>
                        <p className="text-2xl font-bold">
                          {formatPercentage(result.coeficienteCalculo)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          60% + 2% por ano excedente
                        </p>
                      </div>
                      <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                        <p className="text-sm text-green-700">Valor Estimado</p>
                        <p className="text-2xl font-bold text-green-700">
                          {formatCurrency(result.valorEstimadoBeneficio)}
                        </p>
                        <p className="text-xs text-green-600">
                          Teto: {formatCurrency(result.tetoINSS)}
                        </p>
                      </div>
                    </div>

                    {result.dataElegibilidade && !result.elegivel && (
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Data Prevista de Elegibilidade</p>
                        <p className="text-xl font-bold">
                          {format(new Date(result.dataElegibilidade), 'dd/MM/yyyy', { locale: ptBR })}
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
                      Salvar Simulação
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Transition Rules */}
              {result.regrasTransicao && result.regrasTransicao.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Regras de Transição</CardTitle>
                    <CardDescription>
                      Verifique se você se enquadra em alguma regra de transição
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {result.regrasTransicao.map((regra: any, index: number) => (
                        <div
                          key={index}
                          className={cn(
                            'rounded-lg border p-4',
                            regra.elegivel
                              ? 'border-green-200 bg-green-50'
                              : 'border-gray-200'
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{regra.nome}</h4>
                            <Badge variant={regra.elegivel ? 'default' : 'secondary'}>
                              {regra.elegivel ? 'Elegível' : 'Não Elegível'}
                            </Badge>
                          </div>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {regra.requisitos.map((req: string, i: number) => (
                              <li key={i}>• {req}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!result && (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhuma simulação realizada</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Preencha o formulário e clique em simular para ver os resultados
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
                O cálculo é realizado conforme a <strong>EC 103/2019</strong> (Reforma da Previdência)
                e <strong>Lei 8.213/91</strong>.
              </p>
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">Requisitos - Homens</h4>
                  <ul className="text-blue-700 text-sm">
                    <li>Idade: 65 anos</li>
                    <li>Contribuição: 20 anos</li>
                    <li>Carência: 180 contribuições</li>
                  </ul>
                </div>
                <div className="p-4 bg-pink-50 rounded-lg border border-pink-200">
                  <h4 className="font-semibold text-pink-800 mb-2">Requisitos - Mulheres</h4>
                  <ul className="text-pink-700 text-sm">
                    <li>Idade: 62 anos</li>
                    <li>Contribuição: 15 anos</li>
                    <li>Carência: 180 contribuições</li>
                  </ul>
                </div>
              </div>
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">Cálculo do Benefício</h4>
                <p className="text-green-700 text-sm">
                  O valor do benefício corresponde a 60% da média de todos os salários de contribuição
                  desde julho/1994, acrescido de 2% para cada ano que exceder 20 anos de contribuição
                  (homens) ou 15 anos (mulheres).
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
