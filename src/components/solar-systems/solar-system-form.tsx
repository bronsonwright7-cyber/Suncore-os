"use client";

import { useActionState } from "react";
import {
  createSolarSystem,
  updateSolarSystem,
  type FormState,
} from "@/server/solar-systems/actions";
import { searchPropertiesAction } from "@/server/properties/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/forms/combobox";
import { FieldError } from "@/components/forms/field-error";
import type { Database } from "@/types/database";

type SolarSystem = Database["public"]["Tables"]["solar_systems"]["Row"];

const initialState: FormState = {};

interface SolarSystemFormProps {
  solarSystem?: SolarSystem;
  defaultPropertyId?: string;
  defaultPropertyLabel?: string;
}

export function SolarSystemForm({
  solarSystem,
  defaultPropertyId,
  defaultPropertyLabel,
}: SolarSystemFormProps) {
  const action = solarSystem ? updateSolarSystem.bind(null, solarSystem.id) : createSolarSystem;
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex max-w-xl flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="property_id">Property</Label>
        <Combobox
          name="property_id"
          defaultValue={solarSystem?.property_id ?? defaultPropertyId}
          defaultLabel={defaultPropertyLabel}
          placeholder="Select a property"
          searchPlaceholder="Search properties..."
          emptyText="No properties found."
          search={searchPropertiesAction}
          required
        />
        <FieldError messages={state.fieldErrors?.property_id} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="system_size_kw">System size (kW)</Label>
          <Input
            id="system_size_kw"
            name="system_size_kw"
            type="number"
            step="0.01"
            min="0"
            defaultValue={solarSystem?.system_size_kw ?? ""}
          />
          <FieldError messages={state.fieldErrors?.system_size_kw} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="panel_count">Panel count</Label>
          <Input
            id="panel_count"
            name="panel_count"
            type="number"
            min="0"
            step="1"
            defaultValue={solarSystem?.panel_count ?? ""}
          />
          <FieldError messages={state.fieldErrors?.panel_count} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="panel_manufacturer">Panel manufacturer</Label>
          <Input
            id="panel_manufacturer"
            name="panel_manufacturer"
            defaultValue={solarSystem?.panel_manufacturer ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="panel_model">Panel model</Label>
          <Input
            id="panel_model"
            name="panel_model"
            defaultValue={solarSystem?.panel_model ?? ""}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inverter_manufacturer">Inverter manufacturer</Label>
          <Input
            id="inverter_manufacturer"
            name="inverter_manufacturer"
            defaultValue={solarSystem?.inverter_manufacturer ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="inverter_model">Inverter model</Label>
          <Input
            id="inverter_model"
            name="inverter_model"
            defaultValue={solarSystem?.inverter_model ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="install_date">Install date</Label>
        <Input
          id="install_date"
          name="install_date"
          type="date"
          defaultValue={solarSystem?.install_date ?? ""}
        />
        <FieldError messages={state.fieldErrors?.install_date} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="monitoring_platform">Monitoring platform</Label>
          <Input
            id="monitoring_platform"
            name="monitoring_platform"
            defaultValue={solarSystem?.monitoring_platform ?? ""}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="monitoring_system_id">Monitoring system ID</Label>
          <Input
            id="monitoring_system_id"
            name="monitoring_system_id"
            defaultValue={solarSystem?.monitoring_system_id ?? ""}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="notes">Notes</Label>
        <Textarea id="notes" name="notes" rows={4} defaultValue={solarSystem?.notes ?? ""} />
      </div>

      {state.error ? <p className="text-destructive text-sm">{state.error}</p> : null}

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : solarSystem ? "Save changes" : "Create solar system"}
        </Button>
      </div>
    </form>
  );
}
