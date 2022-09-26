import { CurveV1Config } from './config';
import { SwerveConfig } from './forks/swerve/config';
import { CurveForksConfig } from './forks/curve-forks/config';

export const AllCurveForks = [
  ...Object.keys(CurveV1Config),
  ...Object.keys(CurveForksConfig),
  ...Object.keys(SwerveConfig),
];
