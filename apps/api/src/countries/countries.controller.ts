import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { CountriesService } from './countries.service.js';

@Controller()
export class CountriesController {
  constructor(private readonly countries: CountriesService) {}

  @Get('countries')
  list() {
    return { countries: this.countries.listCountries() };
  }

  @Get('countries/:code')
  get(@Param('code') code: string) {
    const country = this.countries.getCountry(code);
    if (!country) throw new NotFoundException(`No hay dossier para ${code}`);
    return { country };
  }

  @Get('topics')
  topics() {
    return this.countries.getTopics();
  }

  @Get('topics/:id')
  topic(@Param('id') id: string) {
    const committee = this.countries.getCommittee(id);
    if (!committee) throw new NotFoundException(`Comisión no encontrada: ${id}`);
    return { committee };
  }
}
