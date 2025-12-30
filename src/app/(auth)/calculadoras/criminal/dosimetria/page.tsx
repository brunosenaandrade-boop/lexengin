'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Calculator, Download, FileText, Scale, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

import { trpc } from '@/lib/trpc/client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  penaBase: z.string().min(1, 'Informe a pena base'),
  unidadePena: z.enum(['anos', 'meses', 'dias']),
  circunstanciasJudiciais: z.number().min(-3).max(3),
  agravantes: z.array(z.object({
    descricao: z.string().min(1, 'Descreva a agravante'),
    fator: z.number().min(0).max(1),
  })),
  atenuantes: z.array(z.object({
    descricao: z.string().min(1, 'Descreva a atenuante'),
    fator: z.number().min(0).max(1),
  })),
  causasAumento: z.array(z.object({
    descricao: z.string().min(1, 'Descreva a causa'),
    fracao: z.string().min(1, 'Informe a fração'),
  })),
  causasDiminuicao: z.array(z.object({
    descricao: z.string().min(1, 'Descreva a causa'),
    fracao: z.string().min(1, 'Informe a fração'),
  })),
});

type FormData = z.infer<typeof formSchema>;

const AGRAVANTES_COMUNS = [
  'Reincidência (art. 61, I)',
  'Motivo fútil ou torpe (art. 61, II, a)',
  'Meio cruel (art. 61, II, d)',
  'Contra ascendente, descendente, irmão ou cônjuge (art. 61, II, e)',
  'Com abuso de autoridade (art. 61, II, f)',
  'Contra criança ou idoso (art. 61, II, h)',
];

const ATENUANTES_COMUNS = [
  'Menoridade relativa (art. 65, I)',
  'Desconhecimento da lei (art. 65, II)',
  'Confissão espontânea (art. 65, III, d)',
  'Reparação do dano (art. 65, III, b)',
  'Coação moral resistível (art. 65, III, c)',
];

const FRACOES_COMUNS = [
  { value: '1/6', label: '1/6 (um sexto)' },
  { value: '1/3', label: '1/3 (um terço)' },
  { value: '1/2', label: '1/2 (metade)' },
  { value: '2/3', label: '2/3 (dois terços)' },
  { value: '1/4', label: '1/4 (um quarto)' },
  { value: '1/5', label: '1/5 (um quinto)' },
];

export default function DosimetriaCalculatorPage() {
  const [result, setResult] = useState<any>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      penaBase: '',
      unidadePena: 'anos',
      circunstanciasJudiciais: 0,
      agravantes: [],
      atenuantes: [],
      causasAumento: [],
      causasDiminuicao: [],
    },
  });

  const { fields: agravantesFields, append: appendAgravante, remove: removeAgravante } = useFieldArray({
    control: form.control,
    name: 'agravantes',
  });

  const { fields: atenuantesFields, append: appendAtenuante, remove: removeAtenuante } = useFieldArray({
    control: form.control,
    name: 'atenuantes',
  });

  const { fields: causasAumentoFields, append: appendCausaAumento, remove: removeCausaAumento } = useFieldArray({
    control: form.control,
    name: 'causasAumento',
  });

  const { fields: causasDiminuicaoFields, append: appendCausaDiminuicao, remove: removeCausaDiminuicao } = useFieldArray({
    control: form.control,
    name: 'causasDiminuicao',
  });

  const calculateMutation = trpc.calculadoras.dosimetria.useMutation({
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
      penaBase: parseFloat(data.penaBase),
      unidadePena: data.unidadePena,
      circunstanciasJudiciais: data.circunstanciasJudiciais,
      agravantes: data.agravantes,
      atenuantes: data.atenuantes,
      causasAumento: data.causasAumento,
      causasDiminuicao: data.causasDiminuicao,
    });
  };

  const circunstancias = form.watch('circunstanciasJudiciais');

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Scale className="h-8 w-8 text-red-500" />
          Calculadora de Dosimetria
        </h1>
        <p className="text-muted-foreground mt-2">
          Cálculo trifásico da pena conforme art. 68 do Código Penal
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                1ª Fase - Pena Base
              </CardTitle>
              <CardDescription>
                Circunstâncias judiciais do art. 59 do CP
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="penaBase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pena Mínima do Tipo</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="2"
                              step="0.1"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="unidadePena"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unidade</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="anos">Anos</SelectItem>
                              <SelectItem value="meses">Meses</SelectItem>
                              <SelectItem value="dias">Dias</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="circunstanciasJudiciais"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Circunstâncias Judiciais Desfavoráveis: {circunstancias > 0 ? `+${circunstancias}` : circunstancias}
                        </FormLabel>
                        <FormControl>
                          <div className="pt-2">
                            <Slider
                              min={-3}
                              max={3}
                              step={1}
                              value={[field.value]}
                              onValueChange={(value) => field.onChange(value[0])}
                              className="w-full"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>-3 (favorável)</span>
                              <span>0 (neutro)</span>
                              <span>+3 (desfavorável)</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Culpabilidade, antecedentes, conduta social, personalidade, motivos, circunstâncias, consequências, comportamento da vítima
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2ª Fase - Agravantes e Atenuantes</CardTitle>
              <CardDescription>
                Circunstâncias legais dos arts. 61 a 67 do CP
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Agravantes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-red-600">Agravantes</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendAgravante({ descricao: '', fator: 0.1 })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>
                {agravantesFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Select
                        value={form.watch(`agravantes.${index}.descricao`)}
                        onValueChange={(value) => form.setValue(`agravantes.${index}.descricao`, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione ou digite..." />
                        </SelectTrigger>
                        <SelectContent>
                          {AGRAVANTES_COMUNS.map((ag) => (
                            <SelectItem key={ag} value={ag}>{ag}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="number"
                      className="w-20"
                      step="0.05"
                      min="0"
                      max="1"
                      placeholder="Fator"
                      {...form.register(`agravantes.${index}.fator`, { valueAsNumber: true })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAgravante(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                {agravantesFields.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhuma agravante adicionada
                  </p>
                )}
              </div>

              <Separator />

              {/* Atenuantes */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-green-600">Atenuantes</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendAtenuante({ descricao: '', fator: 0.1 })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>
                {atenuantesFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Select
                        value={form.watch(`atenuantes.${index}.descricao`)}
                        onValueChange={(value) => form.setValue(`atenuantes.${index}.descricao`, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione ou digite..." />
                        </SelectTrigger>
                        <SelectContent>
                          {ATENUANTES_COMUNS.map((at) => (
                            <SelectItem key={at} value={at}>{at}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      type="number"
                      className="w-20"
                      step="0.05"
                      min="0"
                      max="1"
                      placeholder="Fator"
                      {...form.register(`atenuantes.${index}.fator`, { valueAsNumber: true })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAtenuante(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                {atenuantesFields.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhuma atenuante adicionada
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3ª Fase - Causas de Aumento e Diminuição</CardTitle>
              <CardDescription>
                Majorantes e minorantes previstas na parte especial
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Causas de Aumento */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-red-600">Causas de Aumento</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendCausaAumento({ descricao: '', fracao: '1/3' })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>
                {causasAumentoFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <Input
                      className="flex-1"
                      placeholder="Descrição da causa"
                      {...form.register(`causasAumento.${index}.descricao`)}
                    />
                    <Select
                      value={form.watch(`causasAumento.${index}.fracao`)}
                      onValueChange={(value) => form.setValue(`causasAumento.${index}.fracao`, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Fração" />
                      </SelectTrigger>
                      <SelectContent>
                        {FRACOES_COMUNS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCausaAumento(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                {causasAumentoFields.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhuma causa de aumento adicionada
                  </p>
                )}
              </div>

              <Separator />

              {/* Causas de Diminuição */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-green-600">Causas de Diminuição</h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendCausaDiminuicao({ descricao: '', fracao: '1/3' })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Button>
                </div>
                {causasDiminuicaoFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-start">
                    <Input
                      className="flex-1"
                      placeholder="Descrição da causa"
                      {...form.register(`causasDiminuicao.${index}.descricao`)}
                    />
                    <Select
                      value={form.watch(`causasDiminuicao.${index}.fracao`)}
                      onValueChange={(value) => form.setValue(`causasDiminuicao.${index}.fracao`, value)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Fração" />
                      </SelectTrigger>
                      <SelectContent>
                        {FRACOES_COMUNS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCausaDiminuicao(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                {causasDiminuicaoFields.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhuma causa de diminuição adicionada
                  </p>
                )}
              </div>

              <Button
                type="button"
                className="w-full mt-4"
                disabled={calculateMutation.isPending}
                onClick={form.handleSubmit(onSubmit)}
              >
                {calculateMutation.isPending ? (
                  <>Calculando...</>
                ) : (
                  <>
                    <Calculator className="mr-2 h-4 w-4" />
                    Calcular Dosimetria
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="space-y-6">
          {result && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Resultado da Dosimetria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4">
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <p className="text-sm text-red-700">Pena Definitiva</p>
                      <p className="text-3xl font-bold text-red-700">
                        {result.penaDefinitiva.toFixed(2)} {form.watch('unidadePena')}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Pena Base</p>
                        <p className="text-xl font-bold">
                          {result.penaBase} {form.watch('unidadePena')}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Pena Intermediária</p>
                        <p className="text-xl font-bold">
                          {result.penaIntermediaria.toFixed(2)} {form.watch('unidadePena')}
                        </p>
                      </div>
                    </div>

                    <div className={cn(
                      'rounded-lg border p-4',
                      result.regimeInicial === 'fechado' ? 'border-red-300 bg-red-50' :
                      result.regimeInicial === 'semiaberto' ? 'border-amber-300 bg-amber-50' :
                      'border-green-300 bg-green-50'
                    )}>
                      <p className="text-sm text-muted-foreground">Regime Inicial</p>
                      <p className={cn(
                        'text-xl font-bold uppercase',
                        result.regimeInicial === 'fechado' ? 'text-red-700' :
                        result.regimeInicial === 'semiaberto' ? 'text-amber-700' :
                        'text-green-700'
                      )}>
                        {result.regimeInicial}
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
                      Detalhamento do cálculo trifásico
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Fase 1 */}
                      <div className="rounded-lg border p-4">
                        <Badge className="mb-2">1ª Fase</Badge>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pena Mínima:</span>
                            <span className="font-medium">{result.detalhamento.fase1.penaBase} {form.watch('unidadePena')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Circunstâncias Judiciais:</span>
                            <span className={cn('font-medium', result.detalhamento.fase1.circunstancias > 0 ? 'text-red-600' : result.detalhamento.fase1.circunstancias < 0 ? 'text-green-600' : '')}>
                              {result.detalhamento.fase1.circunstancias > 0 ? '+' : ''}{result.detalhamento.fase1.circunstancias}
                            </span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-bold">
                            <span>Resultado 1ª Fase:</span>
                            <span>{result.detalhamento.fase1.resultado.toFixed(2)} {form.watch('unidadePena')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Fase 2 */}
                      <div className="rounded-lg border p-4">
                        <Badge className="mb-2">2ª Fase</Badge>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pena da 1ª Fase:</span>
                            <span className="font-medium">{result.detalhamento.fase2.penaAnterior.toFixed(2)} {form.watch('unidadePena')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Agravantes:</span>
                            <span className="font-medium text-red-600">+{(result.detalhamento.fase2.agravantes * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Atenuantes:</span>
                            <span className="font-medium text-green-600">-{(result.detalhamento.fase2.atenuantes * 100).toFixed(0)}%</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-bold">
                            <span>Resultado 2ª Fase:</span>
                            <span>{result.detalhamento.fase2.resultado.toFixed(2)} {form.watch('unidadePena')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Fase 3 */}
                      <div className="rounded-lg border p-4">
                        <Badge className="mb-2">3ª Fase</Badge>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Pena da 2ª Fase:</span>
                            <span className="font-medium">{result.detalhamento.fase3.penaAnterior.toFixed(2)} {form.watch('unidadePena')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Causas de Aumento:</span>
                            <span className="font-medium text-red-600">+{(result.detalhamento.fase3.aumentos * 100).toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Causas de Diminuição:</span>
                            <span className="font-medium text-green-600">-{(result.detalhamento.fase3.diminuicoes * 100).toFixed(0)}%</span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-bold">
                            <span>Pena Definitiva:</span>
                            <span className="text-red-600">{result.detalhamento.fase3.resultado.toFixed(2)} {form.watch('unidadePena')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {!result && (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
              <Scale className="h-12 w-12 text-muted-foreground mb-4" />
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
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Fundamentação Legal
          </CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            O cálculo é realizado conforme o <strong>art. 68 do Código Penal</strong>,
            que estabelece o sistema trifásico de dosimetria da pena.
          </p>
          <div className="grid gap-4 md:grid-cols-3 mt-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-800 mb-2">1ª Fase</h4>
              <p className="text-blue-700 text-sm">
                Pena-base fixada com base nas circunstâncias judiciais do art. 59.
              </p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <h4 className="font-semibold text-amber-800 mb-2">2ª Fase</h4>
              <p className="text-amber-700 text-sm">
                Agravantes (arts. 61/62) e atenuantes (arts. 65/66) genéricas.
              </p>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2">3ª Fase</h4>
              <p className="text-red-700 text-sm">
                Causas de aumento e diminuição da parte especial.
              </p>
            </div>
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
            <h4 className="font-semibold mb-2">Regimes de Cumprimento (art. 33 CP)</h4>
            <ul className="text-sm">
              <li><strong>Fechado:</strong> Pena superior a 8 anos</li>
              <li><strong>Semiaberto:</strong> Pena entre 4 e 8 anos (não reincidente)</li>
              <li><strong>Aberto:</strong> Pena igual ou inferior a 4 anos (não reincidente)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
