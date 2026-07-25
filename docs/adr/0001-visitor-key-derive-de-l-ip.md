# Le VisitorKey est dérivé de l'IP, plus du cookie

Jusqu'ici, `meme_view_daily.viewer_key` contenait un identifiant issu d'un cookie, qui n'était posé qu'avec le consentement du Visitor : les visiteurs non consentants recevaient un identifiant neuf à chaque lecture, ce qui rendait la déduplication inopérante et gonflait le décompte des visiteurs uniques. À partir de cette décision, la colonne contient `sha256(ip + jour + secret)`, ce qui déduplique correctement tout le monde sans conserver de trace réidentifiable au-delà de la journée.

## Considered Options

Écrire l'IP brute dans la colonne a été écarté : le `viewer_key` est recopié dans un cookie accessible en JavaScript et transmis à Algolia comme `userToken`, ce qui aurait exposé l'IP à deux endroits interdits. Une empreinte stable dans le temps a été écartée aussi : elle constituerait un identifiant persistant sur les 90 jours de rétention de la table, pour un bénéfice analytique marginal.

## Consequences

Le schéma ne change pas, seul le contenu écrit change, ce qui crée une rupture nette dans l'historique : les lignes antérieures à la bascule portent des identifiants cookie, les suivantes des empreintes. Le décompte des visiteurs uniques baissera visiblement à la bascule, non parce que l'audience baisse mais parce qu'elle était surévaluée. Deux Visitors partageant une même connexion comptent désormais pour un seul.

Le jeton transmis à Algolia devient indépendant du VisitorKey et reste géré par son propre cookie, soumis au consentement.
