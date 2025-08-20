import { useEffect, useState } from 'react'
import { Amplify } from 'aws-amplify'
import { generateClient } from 'aws-amplify/data'
import { uploadData, getUrl, remove } from 'aws-amplify/storage'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import outputs from '../amplify_outputs.json'

Amplify.configure(outputs)
const client = generateClient()

function App({ signOut, user }) {
  const [notes, setNotes] = useState([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState(null)

  useEffect(() => {
    fetchNotes()
  }, [])

  async function fetchNotes() {
    try {
      const { data: notes } = await client.models.Note.list()
      const notesWithImages = await Promise.all(
        notes.map(async (note) => {
          if (note.image) {
            const url = await getUrl({ path: note.image })
            return { ...note, imageUrl: url.url.toString() }
          }
          return note
        })
      )
      setNotes(notesWithImages)
    } catch (error) {
      console.error('Error fetching notes:', error)
    }
  }
  

  async function createNote(event) {
    event.preventDefault()
    if (!name || !description) return

    try {
      let imagePath = null
      if (image) {
        imagePath = `media/${user.userId}/${image.name}`
        await uploadData({
          path: imagePath,
          data: image,
          options: {
            contentType: image.type
          }
        })
      }

      await client.models.Note.create({
        name,
        description,
        image: imagePath
      })

      setName('')
      setDescription('')
      setImage(null)
      fetchNotes()
    } catch (error) {
      console.error('Error creating note:', error)
    }
  }

  async function deleteNote(noteId, imagePath) {
    try {
      if (imagePath) {
        await remove({ path: imagePath })
      }
      await client.models.Note.delete({ id: noteId })
      fetchNotes()
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  return (
    <div>
      <h1>Hello {user.username}</h1>
      <button onClick={signOut}>Sign out</button>
      
      <form onSubmit={createNote}>
        <h2>Create Note</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Note name"
          required
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Note description"
          required
        />
        <input
          type="file"
          onChange={(e) => setImage(e.target.files[0])}
          accept="image/*"
        />
        <button type="submit">Create Note</button>
      </form>

      <div>
        <h2>Your Notes</h2>
        {notes.map((note) => (
          <div key={note.id} className="card">
            <h3>{note.name}</h3>
            <p>{note.description}</p>
            {note.imageUrl && (
              <img src={note.imageUrl} alt={note.name} style={{ width: '200px' }} />
            )}
            <button onClick={() => deleteNote(note.id, note.image)}>
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function AppWithAuth() {
  return (
    <Authenticator>
      {({ signOut, user }) => (
        <App signOut={signOut} user={user} />
      )}
    </Authenticator>
  )
}