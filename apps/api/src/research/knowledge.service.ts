import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CountriesService } from '../countries/countries.service.js';
import type { CommitteeTopic, CountryProfile, CountrySource } from '../countries/countries.types.js';
import { truncate } from '../common/text.js';

export interface KnowledgeDoc {
  id: string;
  title: string;
  text: string;
  citation: CountrySource;
  scope: 'country' | 'committee' | 'knowledge';
  weight: number;
}

interface MarkdownDoc {
  title: string;
  text: string;
  citation: CountrySource;
}

@Injectable()
export class KnowledgeService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeService.name);
  private markdownDocs: MarkdownDoc[] = [];
  private readonly cache = new Map<string, KnowledgeDoc[]>();

  constructor(private readonly countries: CountriesService) {}

  onModuleInit(): void {
    const dir = join(this.countries.getDataDir(), 'knowledge');
    if (!existsSync(dir)) {
      this.logger.warn('No hay carpeta data/knowledge; el asistente usará solo el corpus de países y comisiones.');
      return;
    }

    for (const file of readdirSync(dir).filter((name) => name.endsWith('.md'))) {
      this.markdownDocs.push(...this.parseMarkdown(readFileSync(join(dir, file), 'utf8'), file));
    }
    this.logger.log(`Base de conocimiento: ${this.markdownDocs.length} fragmentos editoriales.`);
  }

  buildDocs(country: CountryProfile, committee: CommitteeTopic): KnowledgeDoc[] {
    const cacheKey = `${country.code}:${committee.id}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const countrySource = country.sources.find((source) => source.kind === 'official') ?? country.sources[0];
    const committeeSource = committee.sources[0];
    if (!countrySource || !committeeSource) throw new Error('Faltan fuentes para construir el contexto');

    const stance = this.countries.getStance(country, committee.id);
    const docs: KnowledgeDoc[] = [];
    let counter = 0;
    const push = (
      title: string,
      text: string,
      citation: CountrySource,
      scope: KnowledgeDoc['scope'],
      weight: number,
    ) => {
      if (!text || text.trim().length < 40) return;
      counter += 1;
      docs.push({
        id: `${cacheKey}:${counter}`,
        title,
        text: truncate(text.trim(), 1800),
        citation,
        scope,
        weight,
      });
    };

    push(`${country.name} · identidad`, country.summary, countrySource, 'country', 1.15);
    push(
      `${country.name} · perfil en la ONU`,
      `${country.unProfile.bloc}. Estilo de negociación: ${country.unProfile.style}`,
      countrySource,
      'country',
      1.15,
    );
    push(
      `${country.name} · alianzas y tensiones`,
      `Aliados habituales: ${country.unProfile.allies.join(', ')}. Tensiones: ${country.unProfile.tensions.join('; ')}.`,
      countrySource,
      'country',
      1.1,
    );
    push(`${country.name} · líneas rojas`, country.unProfile.redLines.join(' '), countrySource, 'country', 1.1);
    push(
      `${country.name} · IA y educación`,
      country.context.aiAndEducation,
      countrySource,
      'country',
      1.2,
    );
    push(`${country.name} · empleo juvenil`, country.context.youthLabour, countrySource, 'country', 1.2);
    push(
      `${country.name} · gobernanza digital`,
      country.context.digitalGovernance,
      countrySource,
      'country',
      1.1,
    );
    push(
      `${country.name} en ${committee.abbr} · postura`,
      stance.position,
      committeeSource,
      'country',
      1.25,
    );
    push(
      `${country.name} en ${committee.abbr} · prioridades`,
      stance.priorities.join(' '),
      committeeSource,
      'country',
      1.2,
    );
    push(
      `${country.name} en ${committee.abbr} · vulnerabilidad`,
      stance.vulnerability,
      committeeSource,
      'country',
      1.1,
    );
    push(
      `${country.name} en ${committee.abbr} · palanca`,
      stance.leverage,
      committeeSource,
      'country',
      1.1,
    );
    push(`${country.name} · tips de negociación`, country.tips.join(' '), countrySource, 'country', 1.0);
    push(`${country.name} · datos del país`, country.facts.join(' '), countrySource, 'country', 0.9);

    push(`${committee.abbr} · tópico`, committee.topic, committeeSource, 'committee', 1.15);
    push(`${committee.abbr} · mandato`, committee.mandate, committeeSource, 'committee', 1.0);
    push(
      `${committee.abbr} · pregunta esencial`,
      committee.essentialQuestion,
      committeeSource,
      'committee',
      1.0,
    );
    for (const subtopic of committee.subtopics) {
      push(
        `${committee.abbr} · ${subtopic.label}`,
        `${subtopic.label}: ${subtopic.description}`,
        committeeSource,
        'committee',
        1.0,
      );
    }
    push(
      `${committee.abbr} · preguntas clave`,
      committee.keyQuestions.join(' '),
      committeeSource,
      'committee',
      0.95,
    );
    push(
      `${committee.abbr} · glosario`,
      committee.glossary.map((entry) => `${entry.term}: ${entry.definition}`).join(' '),
      committeeSource,
      'committee',
      0.9,
    );
    push(
      `${committee.abbr} · palancas de política`,
      committee.policyLevers.join(' '),
      committeeSource,
      'committee',
      0.95,
    );
    push(
      `${committee.abbr} · tensiones`,
      committee.debateTensions.join(' '),
      committeeSource,
      'committee',
      0.9,
    );
    push(
      `${committee.abbr} · actores`,
      committee.actors.join(', '),
      committeeSource,
      'committee',
      0.85,
    );

    for (const doc of this.markdownDocs) {
      push(doc.title, doc.text, doc.citation, 'knowledge', 0.9);
    }

    this.cache.set(cacheKey, docs);
    return docs;
  }

  getKnowledgeCount(): number {
    return this.markdownDocs.length;
  }

  private parseMarkdown(raw: string, fileName: string): MarkdownDoc[] {
    const lines = raw.split(/\r?\n/);
    const sourceLine = lines.find((line) => line.toLowerCase().startsWith('> fuente:'));
    const urlLine = lines.find((line) => line.toLowerCase().startsWith('> url:'));
    const citation: CountrySource = {
      label: sourceLine?.replace(/^>\s*fuente:\s*/i, '').trim() || fileName.replace('.md', ''),
      url: urlLine?.replace(/^>\s*url:\s*/i, '').trim() || 'https://www.un.org/en/mun',
      kind: 'editorial',
    };

    const sections = raw.split(/^##\s+/m).slice(1);
    if (sections.length === 0) {
      return [{ title: fileName.replace('.md', ''), text: raw.trim(), citation }];
    }

    return sections
      .map((section) => {
        const [heading, ...body] = section.split(/\r?\n/);
        return {
          title: heading?.trim() || fileName,
          text: body.join('\n').replace(/^>\s*.*$/gm, '').trim(),
          citation,
        };
      })
      .filter((doc) => doc.text.length > 40);
  }
}
