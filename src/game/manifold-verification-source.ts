import rawVerifierData from './manifolds-verifier.generated.json'
import { manifoldGame } from './game-data'
import {
  createMathlibVerificationSource,
  type MathlibVerifierData,
} from './mathlib-verification-source'

const source = createMathlibVerificationSource(
  manifoldGame,
  rawVerifierData as MathlibVerifierData,
  'Manifold Adventure',
)

export const buildManifoldChallengeSource = source.buildChallengeSource
export const buildManifoldGoalInspectionSource = source.buildGoalInspectionSource
export const manifoldContextModule = source.contextModule
