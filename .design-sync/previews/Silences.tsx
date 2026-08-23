import { Silences } from "@orcha/charte";

/**
 * Ce qui est déclaré mais sans effet.
 *
 * Chaque écart porte sa règle de détection, jamais un verdict seul : un outil
 * qui annonce une panne sans dire comment il l'a trouvée est pire que pas
 * d'outil.
 */
export function TroisEcarts() {
  return (
    <Silences
      silences={[
        {
          cause: "plugin déclaré, cache absent",
          detail:
            "Inscrit dans enabledPlugins, mais ~/.claude/plugins/cache/claude-config n'existe pas sur le disque. Ses 16 compétences ne chargent pas.",
        },
        {
          cause: "agent sans description",
          detail:
            "Claude choisit un agent d'après sa description, et d'après elle seule. Sans description, il ne sera jamais appelé.",
        },
        {
          cause: "étape déclarée, fichier absent",
          detail:
            "etapes/mise-en-ligne.md est nommé dans le SKILL.md ; le fichier n'est pas là. L'étape ne s'exécutera jamais.",
        },
      ]}
    />
  );
}

/** Un seul écart — le cas le plus fréquent. */
export function UnSeul() {
  return (
    <Silences
      silences={[
        {
          cause: "hook sans commande",
          detail: "Déclaré dans settings.json sans champ command : rien ne s'exécutera.",
        },
      ]}
    />
  );
}
