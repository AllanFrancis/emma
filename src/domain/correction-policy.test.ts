import { describe, expect, test } from "bun:test";
import {
  MAX_CORRECTIONS,
  maxCorrectionsPara,
  PRIORIDADE_DE_CATEGORIA,
  resolverCorrecoes,
  temEvidencia,
} from "./correction-policy";
import type { Category, Correction } from "./turn-contract.generated";

const FALA = "I pretend to do a check-in and I have 25 years, people is nice here";

function correcao(original: string, category: Category, suggested = "x"): Correction {
  return { original, suggested, explanation_pt: "porque sim", category };
}

describe("evidencia citada (DEC-20260916-1611)", () => {
  test("aceita trecho literal da fala", () => {
    expect(temEvidencia(correcao("I pretend", "false_friend"), FALA)).toBe(true);
  });

  test("aceita apesar de caixa e apostrofo diferentes — a fala e transcrita", () => {
    expect(temEvidencia(correcao("I PRETEND", "false_friend"), FALA)).toBe(true);
    expect(temEvidencia(correcao("people\u2019s", "grammar"), "people's house")).toBe(true);
  });

  test("recusa parafrase: o aluno nao reconhece o proprio erro numa frase que nao disse", () => {
    expect(temEvidencia(correcao("I intend to check in", "false_friend"), FALA)).toBe(false);
  });

  test("recusa original vazio", () => {
    expect(temEvidencia(correcao("", "grammar"), FALA)).toBe(false);
    expect(temEvidencia(correcao("   ", "grammar"), FALA)).toBe(false);
  });

  test("correcao sem evidencia nao chega ao aluno, mas fica auditavel", () => {
    const resolvidas = resolverCorrecoes(
      [correcao("I intend", "false_friend"), correcao("people is", "grammar")],
      FALA,
    );
    expect(resolvidas.aceitas.map((c) => c.original)).toEqual(["people is"]);
    expect(resolvidas.semEvidencia.map((c) => c.original)).toEqual(["I intend"]);
  });
});

describe("teto e truncagem por prioridade, nunca por ordem de chegada", () => {
  test("nunca mais de 3 saem do nucleo", () => {
    const muitas = [
      correcao("people is", "register"),
      correcao("I pretend", "register"),
      correcao("I have 25 years", "register"),
      correcao("check-in", "register"),
    ];
    const resolvidas = resolverCorrecoes(muitas, FALA, MAX_CORRECTIONS);
    expect(resolvidas.aceitas).toHaveLength(MAX_CORRECTIONS);
    expect(resolvidas.truncadas).toHaveLength(1);
  });

  test("register chega primeiro e e cortado; false_friend chega ultimo e sobrevive", () => {
    // Este e o teste que prova a ordem: por ordem de chegada, `register` ficaria e
    // `false_friend` cairia — o que deixaria o erro mais caro da conversa sem correcao.
    const propostas = [
      correcao("check-in", "register"),
      correcao("people is", "grammar"),
      correcao("I pretend", "false_friend"),
    ];
    const resolvidas = resolverCorrecoes(propostas, FALA, 1);
    expect(resolvidas.aceitas.map((c) => c.category)).toEqual(["false_friend"]);
    expect(resolvidas.truncadas.map((c) => c.category)).toEqual(["grammar", "register"]);
  });

  test("a ordem completa segue a tabela de prioridade", () => {
    const umaDeCada: Correction[] = [
      correcao("check-in", "register"),
      correcao("25 years", "vocabulary"),
      correcao("here", "preposition"),
      correcao("people is", "grammar"),
      correcao("do a", "word_order"),
      correcao("I pretend", "false_friend"),
    ];
    const resolvidas = resolverCorrecoes(umaDeCada, FALA, MAX_CORRECTIONS);
    const todas = [...resolvidas.aceitas, ...resolvidas.truncadas].map((c) => c.category);
    expect(todas).toEqual([...PRIORIDADE_DE_CATEGORIA]);
  });

  test("empate de categoria preserva a ordem em que o modelo propos", () => {
    const duasIguais = [correcao("people is", "grammar"), correcao("I have 25 years", "grammar")];
    const resolvidas = resolverCorrecoes(duasIguais, FALA, 1);
    expect(resolvidas.aceitas[0]?.original).toBe("people is");
  });

  test("o teto do nucleo nunca excede o teto do schema, mesmo se pedirem mais", () => {
    const cinco = Array.from({ length: 5 }, () => correcao("people is", "grammar"));
    expect(resolverCorrecoes(cinco, FALA, 99).aceitas).toHaveLength(MAX_CORRECTIONS);
  });

  test("lista vazia e ausente nao explodem", () => {
    expect(resolverCorrecoes([], FALA).aceitas).toEqual([]);
    expect(resolverCorrecoes(undefined as unknown as Correction[], FALA).aceitas).toEqual([]);
  });
});

describe("teto por nivel", () => {
  test("nivel 1 aguenta 1 correcao; tres seria o que faz a pessoa desistir", () => {
    expect(maxCorrectionsPara(1)).toBe(1);
    expect(maxCorrectionsPara(2)).toBe(2);
    expect(maxCorrectionsPara(3)).toBe(2);
    expect(maxCorrectionsPara(4)).toBe(MAX_CORRECTIONS);
    expect(maxCorrectionsPara(5)).toBe(MAX_CORRECTIONS);
  });
});
