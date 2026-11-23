# Espace membre French4PR — mise en route

L'espace membre est une application séparée du site vitrine (dossier `app/`).
Elle s'appuie sur **Supabase**, qui gère les comptes, la base de données et les e-mails de connexion.
Compter environ 30 minutes, une seule fois.

## 1. Créer le projet Supabase (10 min)

1. Créer un compte sur https://supabase.com, puis **New project**.
   - Nom : `french4pr`
   - Région : **Canada (Central)**, pour garder les données des élèves au Canada.
   - Mot de passe de la base : le générer et le garder dans un gestionnaire de mots de passe.
2. Ouvrir **SQL Editor → New query**, coller **tout** le contenu de `supabase/migrations/0001_member_area.sql`, puis cliquer sur **Run**. Le message attendu est « Success. No rows returned ».

## 2. Régler la connexion par e-mail (5 min)

Dans **Authentication** :

- **Sign In / Providers → Email** : laisser Email activé et **décocher « Allow new users to sign up »**. Seules les personnes que tu invites pourront entrer.
- **URL Configuration**
  - Site URL : `https://app.french4pr.com` (ou l'adresse Vercel de l'app tant que le domaine n'est pas prêt)
  - Redirect URLs : ajouter `https://app.french4pr.com/**` et l'adresse Vercel de l'app suivie de `/**`
- **Emails → Templates** : remplacer le lien de deux modèles.
  - **Magic Link** :
    ```html
    <h2>Sign in to French4PR</h2>
    <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/">Sign in to my space</a></p>
    <p>This link works once and expires in one hour.</p>
    ```
  - **Invite user** :
    ```html
    <h2>Bienvenue chez French4PR!</h2>
    <p>Your student space is ready: your classes, your Teams links and your progress to NCLC 7.</p>
    <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next=/profile">Open my space</a></p>
    ```

> Supabase n'envoie que quelques e-mails par heure avec son service intégré. C'est suffisant pour tester. Avant d'inviter de vrais élèves, il faudra brancher un service d'envoi : Authentication → Emails → SMTP Settings, par exemple avec Resend (gratuit jusqu'à 3 000 e-mails par mois).

## 3. Mettre l'app en ligne sur Vercel (5 min)

1. Vercel → **Add New → Project**, puis choisir le même dépôt `french4pr`.
2. **Root Directory** : `app`. Vercel détecte Next.js automatiquement.
3. **Environment Variables** : les 4 valeurs se trouvent dans Supabase → Project Settings → API.

| Nom | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé `anon` / publishable |
| `SUPABASE_SERVICE_ROLE_KEY` | clé `service_role` / secret. **Ne jamais la partager, ni dans un chat.** |
| `NEXT_PUBLIC_SITE_URL` | `https://app.french4pr.com` (ou l'adresse Vercel de l'app) |

4. **Deploy**. Ensuite, dans Settings → Domains, ajouter `app.french4pr.com` quand le domaine est prêt.

## 4. Devenir admin (2 min)

1. Supabase → Authentication → Users → **Add user → Send invitation**, avec ton e-mail.
2. SQL Editor :
   ```sql
   update public.profiles set role = 'admin' where email = 'TON_EMAIL';
   ```
3. Clique sur le lien reçu par e-mail : tu arrives dans l'espace admin.

Pour la prof : Admin → **Students & teachers → Invite someone**, rôle « Teacher ».

## 5. Relier le formulaire du site (je m'en charge)

Envoie-moi seulement le **Project URL** et la clé **anon / publishable**. Ces deux valeurs sont publiques par conception : la base n'autorise un visiteur qu'à *ajouter* une demande, jamais à lire quoi que ce soit. Je les mets dans `build.py`, et chaque demande d'évaluation arrivera à la fois dans ton Gmail et dans Admin → Assessment requests.

## Comment ça marche au quotidien

1. Un visiteur remplit l'évaluation gratuite. Sa demande apparaît dans **Assessment requests**, triée par date d'expiration du permis.
2. Tu l'appelles sur WhatsApp, tu notes ce qui s'est dit, puis tu changes son étape (contacté, évaluation réservée, évalué).
3. **Enroll** crée son compte et lui envoie l'invitation. Ensuite, sur sa fiche : niveau, formule, groupe.
4. **Groups** : créer un groupe, coller le lien de réunion Teams récurrent, puis « Add classes » génère les cours de toutes les semaines.
5. Après chaque cours, la prof coche les présences. Elle ajoute aussi les devoirs et les résultats des tests blancs.
6. L'élève voit son prochain cours, avec le bouton **Join on Teams**, sa progression et ses devoirs.
