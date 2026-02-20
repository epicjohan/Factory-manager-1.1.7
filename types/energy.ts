
export interface EnergyQuarterlyLog {
  id: string;
  timestamp: string;
  consumption_wh: number;
  production_wh: number;
}

export enum EnergySensorType {
  HOMEWIZARD = 'HOMEWIZARD',
  SHELLY = 'SHELLY',
  MODBUS_TCP = 'MODBUS_TCP',
  MANUAL_CONST = 'MANUAL_CONST'
}

export interface AssetEnergyConfig {
  id: string;
  machineId: string;
  sensorType: EnergySensorType;
  ipAddress?: string;
  apiPort?: number;
  pollInterval: number;
  manualPowerW?: number;
  updated?: string;
}

export interface AssetEnergyLog {
  id: string;
  machineId: string;
  avgPower: number;
  kwhDelta: number;
  timestamp: string;
}

export interface EnergySettings {
  kwhPrice: number;
  maxPowerLimit: number;
  consumptionFactor?: number;
  productionFactor?: number;
}

export interface EnergyLiveData {
    active_power_w: number;
    production_w: number;
    net_power_w: number;
    total_kwh: number;
    total_production_kwh: number;
    l1_amp: number;
    l2_amp: number;
    l3_amp: number;
    updated: string;
}

export interface EnergyHistoricalLog {
    id: string;
    timestamp: string;
    consumption_wh: number;
    production_wh: number;
    avg_consumption_w: number;
    avg_production_w: number;
    peak_w: number;
}
