module

public meta import Lean.Elab.Tactic.Basic

@[expose] public section

/-!
# Manifold Adventure browser inventory policy

The browser passes each level's unlocked names to `manifold_browser_user` as
compact strings. The checker itself is compiled with the course instead of
being redefined and compiled with every attempted proof.
-/

namespace ManifoldAdventure.BrowserPolicy

private structure Inventory where
  allowedKeywords : List String
  allowedTactics : List String
  knownTactics : List String
  disabledTactics : List String
  allowedDeclarations : List String
  knownDeclarations : List String
  disabledDeclarations : List String
  selfDeclarations : List String

private meta def policyList (value : String) : List String :=
  (value.splitOn "\n").filter fun item => !item.isEmpty

private meta def inventoryError (stx : Lean.Syntax) (message : String) :
    Lean.Elab.Tactic.TacticM Unit :=
  Lean.logErrorAt stx ("__LEAN4GAME_INVENTORY_POLICY_2F6C1D__ " ++ message)

private meta partial def checkInventory
    (policy : Inventory) (stx : Lean.Syntax) : Lean.Elab.Tactic.TacticM Unit := do
  match stx with
  | .missing => return
  | .node _ _ args =>
    for arg in args do
      checkInventory policy arg
  | .atom _ value =>
    if 0 < value.length
        && value.toList[0]!.isAlpha
        && !policy.allowedKeywords.contains value
        && !policy.allowedTactics.contains value then
      let message :=
        if policy.disabledTactics.contains value then
          s!"The tactic '{value}' is disabled in this level."
        else if policy.knownTactics.contains value then
          s!"You have not unlocked the tactic '{value}' yet."
        else
          s!"The tactic '{value}' is not available in this game."
      inventoryError stx message
  | .ident _ _ value _ =>
    -- A projection's receiver can be local (`e.continuous_symm`), so it may
    -- not resolve globally until after tactic elaboration. Check individual
    -- components as well as the whole identifier.
    for component in value.components do
      let writtenComponent := component.toString
      if policy.selfDeclarations.contains writtenComponent then
        inventoryError stx
          s!"You cannot use the level theorem '{writtenComponent}' to prove itself."
      else if policy.disabledDeclarations.contains writtenComponent then
        inventoryError stx
          s!"The theorem or definition '{writtenComponent}' is disabled in this level."
      else if policy.knownDeclarations.contains writtenComponent
          && !policy.allowedDeclarations.contains writtenComponent then
        inventoryError stx
          s!"You have not unlocked the theorem or definition '{writtenComponent}' yet."
    let names ← (value :: value.components).flatMapM fun candidate =>
      try Lean.resolveGlobalConst (Lean.mkIdent candidate)
      catch _ => pure []
    for name in names do
      let some info := (← Lean.getEnv).find? name
        | return
      let resolved := name.toString
      let written := value.toString
      let isTracked :=
        policy.knownDeclarations.contains resolved
          || policy.knownDeclarations.contains written
          || policy.disabledDeclarations.contains resolved
          || policy.disabledDeclarations.contains written
          || policy.selfDeclarations.contains resolved
          || policy.selfDeclarations.contains written
      let isTheorem :=
        match info with
        | .thmInfo .. => true
        | _ => false
      if !isTracked && !isTheorem then return
      if policy.selfDeclarations.contains resolved
          || policy.selfDeclarations.contains written then
        inventoryError stx
          s!"You cannot use the level theorem '{resolved}' to prove itself."
      else if policy.disabledDeclarations.contains resolved
          || policy.disabledDeclarations.contains written then
        inventoryError stx
          s!"The theorem or definition '{resolved}' is disabled in this level."
      else if !policy.knownDeclarations.contains resolved
          && !policy.knownDeclarations.contains written then
        inventoryError stx
          s!"The theorem or definition '{resolved}' is not available in this game."
      else if !policy.allowedDeclarations.contains resolved
          && !policy.allowedDeclarations.contains written then
        inventoryError stx
          s!"You have not unlocked the theorem or definition '{resolved}' yet."

syntax (name := manifoldBrowserUser)
  "manifold_browser_user" ppLine
  str ppLine str ppLine str ppLine str ppLine
  str ppLine str ppLine str ppLine str ppLine
  optional(tacticSeqIndentGt) : tactic

elab_rules : tactic
  | `(tactic| manifold_browser_user
      $allowedKeywords:str
      $allowedTactics:str
      $knownTactics:str
      $disabledTactics:str
      $allowedDeclarations:str
      $knownDeclarations:str
      $disabledDeclarations:str
      $selfDeclarations:str
      $[$tactics:tacticSeq]?) => do
    let policy : Inventory := {
      allowedKeywords := policyList allowedKeywords.getString
      allowedTactics := policyList allowedTactics.getString
      knownTactics := policyList knownTactics.getString
      disabledTactics := policyList disabledTactics.getString
      allowedDeclarations := policyList allowedDeclarations.getString
      knownDeclarations := policyList knownDeclarations.getString
      disabledDeclarations := policyList disabledDeclarations.getString
      selfDeclarations := policyList selfDeclarations.getString
    }
    if let some tactics := tactics then
      checkInventory policy tactics.raw
      Lean.Elab.Tactic.evalTactic tactics

end ManifoldAdventure.BrowserPolicy
