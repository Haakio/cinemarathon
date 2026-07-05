import Head from 'next/head'

/**
 * Page publique SEO : l'ordre des films Marvel (MCU). Rendue statiquement,
 * indexable par Google — cible les recherches "ordre chronologique marvel",
 * "ordre films marvel", etc. Sert de porte d'entrée vers le site.
 */

const ORDRE_CHRONOLOGIQUE = [
  'Captain America : First Avenger',
  'Captain Marvel',
  'Iron Man',
  'Iron Man 2',
  "L'Incroyable Hulk",
  'Thor',
  'Avengers',
  'Iron Man 3',
  'Thor : Le Monde des ténèbres',
  "Captain America : Le Soldat de l'hiver",
  'Les Gardiens de la Galaxie',
  'Les Gardiens de la Galaxie Vol. 2',
  "Avengers : L'Ère d'Ultron",
  'Ant-Man',
  'Captain America : Civil War',
  'Black Widow',
  'Black Panther',
  'Spider-Man : Homecoming',
  'Doctor Strange',
  'Thor : Ragnarok',
  'Ant-Man et la Guêpe',
  'Avengers : Infinity War',
  'Avengers : Endgame',
  'Spider-Man : Far From Home',
  'Les Éternels',
  'Shang-Chi et la Légende des Dix Anneaux',
  'Spider-Man : No Way Home',
  'Doctor Strange in the Multiverse of Madness',
  'Thor : Love and Thunder',
  'Black Panther : Wakanda Forever',
  'Ant-Man et la Guêpe : Quantumania',
  'Les Gardiens de la Galaxie Vol. 3',
  'The Marvels',
  'Deadpool & Wolverine',
  'Captain America : Brave New World',
  'Thunderbolts',
  'Les 4 Fantastiques : Premiers Pas',
]

const ORDRE_DE_SORTIE = [
  ['Iron Man', 2008],
  ["L'Incroyable Hulk", 2008],
  ['Iron Man 2', 2010],
  ['Thor', 2011],
  ['Captain America : First Avenger', 2011],
  ['Avengers', 2012],
  ['Iron Man 3', 2013],
  ['Thor : Le Monde des ténèbres', 2013],
  ["Captain America : Le Soldat de l'hiver", 2014],
  ['Les Gardiens de la Galaxie', 2014],
  ["Avengers : L'Ère d'Ultron", 2015],
  ['Ant-Man', 2015],
  ['Captain America : Civil War', 2016],
  ['Doctor Strange', 2016],
  ['Les Gardiens de la Galaxie Vol. 2', 2017],
  ['Spider-Man : Homecoming', 2017],
  ['Thor : Ragnarok', 2017],
  ['Black Panther', 2018],
  ['Avengers : Infinity War', 2018],
  ['Ant-Man et la Guêpe', 2018],
  ['Captain Marvel', 2019],
  ['Avengers : Endgame', 2019],
  ['Spider-Man : Far From Home', 2019],
  ['Black Widow', 2021],
  ['Shang-Chi et la Légende des Dix Anneaux', 2021],
  ['Les Éternels', 2021],
  ['Spider-Man : No Way Home', 2021],
  ['Doctor Strange in the Multiverse of Madness', 2022],
  ['Thor : Love and Thunder', 2022],
  ['Black Panther : Wakanda Forever', 2022],
  ['Ant-Man et la Guêpe : Quantumania', 2023],
  ['Les Gardiens de la Galaxie Vol. 3', 2023],
  ['The Marvels', 2023],
  ['Deadpool & Wolverine', 2024],
  ['Captain America : Brave New World', 2025],
  ['Thunderbolts', 2025],
  ['Les 4 Fantastiques : Premiers Pas', 2025],
]

export default function OrdreMarvel() {
  return (
    <>
      <Head>
        <title>Ordre chronologique des films Marvel (MCU) — liste complète | Cinémarathon</title>
        <meta
          name="description"
          content="Dans quel ordre regarder les films Marvel ? La liste complète du MCU en ordre chronologique (l'histoire) et en ordre de sortie — parfaite pour organiser votre marathon Marvel entre amis."
        />
        <meta property="og:title" content="Ordre chronologique des films Marvel (MCU)" />
        <meta property="og:description" content="La liste complète pour votre marathon Marvel : ordre chronologique et ordre de sortie." />
        <link rel="canonical" href="https://xn--cinmarathon-dbb.com/ordre-marvel" />
      </Head>

      <main className="seo-page">
        <a className="seo-page-brand" href="/">🎬 Cinémarathon</a>
        <h1>Dans quel ordre regarder les films Marvel ?</h1>
        <p className="seo-page-intro">
          Deux écoles s'affrontent pour un <strong>marathon Marvel</strong> : l'ordre
          <strong> chronologique</strong> (on suit l'histoire, de 1943 à aujourd'hui) et
          l'ordre <strong>de sortie</strong> (on revit les films comme le public les a
          découverts — recommandé pour un premier visionnage, les surprises restent intactes).
        </p>

        <div className="seo-page-columns">
          <section>
            <h2>Ordre chronologique (l'histoire)</h2>
            <ol>
              {ORDRE_CHRONOLOGIQUE.map(title => <li key={title}>{title}</li>)}
            </ol>
          </section>
          <section>
            <h2>Ordre de sortie (au cinéma)</h2>
            <ol>
              {ORDRE_DE_SORTIE.map(([title, year]) => <li key={title}>{title} <span>({year})</span></li>)}
            </ol>
          </section>
        </div>

        <section className="seo-page-cta">
          <h2>Organisez votre marathon Marvel entre amis</h2>
          <p>
            Sur Cinémarathon, créez votre salle privée, importez vos films en un clic
            (affiches, synopsis, durées automatiques), suivez la progression du groupe,
            votez pour la prochaine séance et notez chaque film. Gratuit.
          </p>
          <a className="btn-play" href="/">Créer mon marathon</a>
        </section>
      </main>
    </>
  )
}
