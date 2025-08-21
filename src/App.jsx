import { useEffect, useState, useRef } from "react";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import { uploadData, getUrl, remove } from "aws-amplify/storage";
import {
  Authenticator,
  Card,
  Flex,
  Heading,
  Text,
  TextField,
  TextAreaField,
  Button,
  Image,
  View,
  useTheme,
  SelectField,
  Badge,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
} from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import outputs from "../amplify_outputs.json";

Amplify.configure(outputs);
const client = generateClient();

function App({ signOut, user }) {
  const [filteredNotes, setFilteredNotes] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [status, setStatus] = useState("active");
  const [currentFilter, setCurrentFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef(null);
  const { tokens } = useTheme();

  useEffect(() => {
    fetchNotes();
  }, []);


  const fetchNotes = async (filterStatus = null) => {
    setIsLoading(true);
    try {
      let filter = {};

      if (filterStatus && filterStatus !== "all") {
        filter = {
          status: {
            eq: filterStatus,
          },
        };
      }

      const notesData = await client.models.Note.list({
        filter: Object.keys(filter).length > 0 ? filter : undefined,
      });

      const notesWithImages = await Promise.all(
        notesData.data.map(async (note) => {
          if (note.image) {
            try {
              const url = await getUrl({ path: note.image });
              return { ...note, imageUrl: url.url.toString() };
            } catch (error) {
              console.error("Error getting image URL:", error);
              return note;
            }
          }
          return note;
        })
      );
      setFilteredNotes(notesWithImages);
    } catch (error) {
      console.error("Error fetching notes:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = async (filter) => {
    setCurrentFilter(filter);

    if (filter !== "all") {
      await fetchNotes(filter);
    } else {
      await fetchNotes();
    }
  };

  const createNote = async (event) => {
    event.preventDefault();
    if (!name || !description) return;

    try {
      let imagePath = null;
      if (image) {
        imagePath = `media/${user.userId}/${image.name}-${Date.now()}`;
        await uploadData({
          path: imagePath,
          data: image,
          options: {
            contentType: image.type,
          },
        });
      }

      await client.models.Note.create({
        name,
        description,
        image: imagePath,
        status: status || "active",
        createdAt: new Date().toISOString(),
      });

      setName("");
      setDescription("");
      setImage(null);
      setStatus("active");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (currentFilter !== "all") {
        await fetchNotes(currentFilter);
      } else {
        await fetchNotes();
      }
    } catch (error) {
      console.error("Error creating note:", error);
    }
  };

  const deleteNote = async (noteId, imagePath) => {
    try {
      if (imagePath) {
        await remove({ path: imagePath });
      }
      await client.models.Note.delete({ id: noteId });

      if (currentFilter !== "all") {
        await fetchNotes(currentFilter);
      } else {
        await fetchNotes();
      }
    } catch (error) {
      console.error("Error deleting note:", error);
    }
  };

  const updateNoteStatus = async (noteId, newStatus) => {
    try {
      await client.models.Note.update({
        id: noteId,
        status: newStatus,
      });

      if (currentFilter !== "all") {
        await fetchNotes(currentFilter);
      } else {
        await fetchNotes();
      }
    } catch (error) {
      console.error("Error updating note status:", error);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "success";
      case "inactive":
        return "neutral";
      default:
        return "info";
    }
  };

  const getFilteredCount = (status) => {
    if (status === "all") return filteredNotes.length;
    return filteredNotes.filter((note) => note.status === status).length;
  };

  return (
    <View padding={tokens.space.large}>
      <Flex direction="column" gap={tokens.space.large}>
        <Flex
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Button variation="primary" onClick={signOut}>
            Sign out
          </Button>
        </Flex>

        <Card variation="elevated">
          <Heading level={2}>Create Note</Heading>
          <form onSubmit={createNote}>
            <Flex direction="column" gap={tokens.space.medium}>
              <TextField
                label="Note name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter note name"
                required
              />

              <TextAreaField
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter note description"
                rows={3}
                required
              />

              <SelectField
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </SelectField>

              <View>
                <Text as="label" fontSize={tokens.fontSizes.medium}>
                  Upload Image
                </Text>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setImage(e.target.files[0])}
                  accept="image/*"
                  style={{ marginTop: tokens.space.small }}
                />
              </View>

              <Button type="submit" variation="primary">
                Create Note
              </Button>
            </Flex>
          </form>
        </Card>

        <View>
          <Flex
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Heading level={2}>Your Notes</Heading>
            <Text color={tokens.colors.font.tertiary}>
              {filteredNotes.length} note{filteredNotes.length !== 1 ? "s" : ""}
              {currentFilter !== "all" && ` (${getFilteredCount("all")} total)`}
            </Text>
          </Flex>

          <Flex
            gap={tokens.space.small}
            marginBottom={tokens.space.medium}
            wrap="wrap"
          >
            <ToggleButtonGroup
              value={currentFilter}
              onChange={(value) => handleFilterChange(value)}
              isExclusive
            >
              <ToggleButton value="all">
                <Flex gap={tokens.space.xs} alignItems="center">
                  <Text>All</Text>
                  <Badge size="small" variation="info">
                    {getFilteredCount("all")}
                  </Badge>
                </Flex>
              </ToggleButton>
              <ToggleButton value="active">
                <Flex gap={tokens.space.xs} alignItems="center">
                  <Text>Active</Text>
                  <Badge size="small" variation="success">
                    {getFilteredCount("active")}
                  </Badge>
                </Flex>
              </ToggleButton>
              <ToggleButton value="inactive">
                <Flex gap={tokens.space.xs} alignItems="center">
                  <Text>Inactive</Text>
                  <Badge size="small" variation="neutral">
                    {getFilteredCount("inactive")}
                  </Badge>
                </Flex>
              </ToggleButton>
            </ToggleButtonGroup>
          </Flex>

          {isLoading && (
            <Card>
              <Text textAlign="center">Loading notes...</Text>
            </Card>
          )}

          {!isLoading && (
            <Grid
              templateColumns={{
                base: "1fr",
                small: "1fr 1fr",
                medium: "1fr 1fr 1fr",
                large: "1fr 1fr 1fr 1fr",
              }}
              gap={tokens.space.medium}
              marginTop={tokens.space.medium}
            >
              {filteredNotes.map((note) => (
                <Card key={note.id} variation="outlined" height="100%">
                  <Flex
                    direction="column"
                    gap={tokens.space.small}
                    height="100%"
                  >
                    <Flex
                      direction="row"
                      justifyContent="space-between"
                      alignItems="flex-start"
                    >
                      <Heading level={4}>{note.name}</Heading>
                      <Badge
                        size="small"
                        variation={getStatusColor(note.status)}
                      >
                        {note.status}
                      </Badge>
                    </Flex>

                    <Text>{note.description}</Text>

                    {note.createdAt && (
                      <Text
                        fontSize={tokens.fontSizes.small}
                        color={tokens.colors.font.tertiary}
                      >
                        Created: {formatDate(note.createdAt)}
                      </Text>
                    )}

                    {note.imageUrl && (
                      <Image
                        src={note.imageUrl}
                        alt={note.name}
                        width="100%"
                        height="150px"
                        objectFit="cover"
                        borderRadius={tokens.radii.medium}
                      />
                    )}

                    <Flex
                      direction="row"
                      gap={tokens.space.small}
                      marginTop="auto"
                    >
                      <SelectField
                        size="small"
                        value={note.status}
                        onChange={(e) =>
                          updateNoteStatus(note.id, e.target.value)
                        }
                        label="Change status"
                        labelHidden
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </SelectField>

                      <Button
                        variation="destructive"
                        onClick={() => deleteNote(note.id, note.image)}
                        size="small"
                      >
                        Delete
                      </Button>
                    </Flex>
                  </Flex>
                </Card>
              ))}

              {filteredNotes.length === 0 && !isLoading && (
                <Card gridColumn="1 / -1">
                  <Text color={tokens.colors.font.tertiary} textAlign="center">
                    {currentFilter === "all"
                      ? "No notes yet. Create your first note above!"
                      : `No ${currentFilter} notes found.`}
                  </Text>
                </Card>
              )}
            </Grid>
          )}
        </View>
      </Flex>
    </View>
  );
}

export default function AppWithAuth() {
  return (
    <Authenticator>
      {({ signOut, user }) => <App signOut={signOut} user={user} />}
    </Authenticator>
  );
}
